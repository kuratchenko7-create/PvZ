// Обрано Vue: шаблони пишуться прямо в наявному HTML, а браузеру не потрібна компіляція JSX через Babel.

const API_URL = 'https://jsonplaceholder.typicode.com/comments?postId=2';
const CONVERTER_URL = 'https://api.frankfurter.dev/v1/latest';

// Функцію renderTransactions із практикуму 7 видалено: список тепер рендерить компонент ExpenseRow через v-for.
// Робота зі сховищами (localStorage, IndexedDB, міграція) винесена в js/storage.js.

// Режим ?storage=local вмикає роботу лише з localStorage — для перевірки кроку 4 у DevTools.
const FORCE_LOCAL_STORAGE = new URLSearchParams(location.search).get('storage') === 'local';

const CATEGORY_TAGS = {
  'харчування': 'tag--food',
  'транспорт': 'tag--transport',
  'розваги': 'tag--entertainment',
  'житло': 'tag--housing',
};

function todayISO() {
  // Локаль sv-SE дає формат YYYY-MM-DD у місцевому часовому поясі.
  return new Date().toLocaleDateString('sv-SE');
}

function emptyTransaction() {
  return { amount: '', type: '', category: '', date: todayISO() };
}

function formatMoney(value) {
  return `${value.toFixed(2)} грн`;
}

const ExpenseRow = {
  props: {
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, default: '' },
    editable: { type: Boolean, default: false },
  },
  emits: ['remove', 'edit'],
  computed: {
    formattedDate() {
      return this.date ? new Date(`${this.date}T00:00`).toLocaleDateString('uk-UA') : '';
    },
  },
  methods: {
    remove() {
      this.$emit('remove');
    },
    edit() {
      this.$emit('edit');
    },
  },
  template: `
    <li class="transaction-item" :class="type === 'дохід' ? 'income' : 'expense'">
      <div class="transaction-item__row">
        <span class="transaction-item__text">
          {{ amount }} грн ({{ type }}, {{ category }})
          <time v-if="date" class="transaction-item__date" :datetime="date">{{ formattedDate }}</time>
        </span>
        <span class="transaction-item__actions">
          <button v-if="editable" type="button" class="transaction-item__edit" @click="edit">Редагувати</button>
          <button type="button" class="transaction-item__remove" @click="remove">Видалити</button>
        </span>
      </div>
      <slot></slot>
    </li>
  `,
};

const app = Vue.createApp({
  components: { ExpenseRow },
  data() {
    return {
      // Крок 9. Масив заповнюється з IndexedDB (getAllItems), а не з жорстко заданих даних.
      transactions: [],
      newTransaction: emptyTransaction(),
      editingId: null,
      storageMode: 'idb', // 'idb' або 'local' (запасний варіант, якщо IndexedDB недоступна)
      storageLoading: true,
      storageError: '',
      storageNotice: '',
      apiTransactions: [],
      apiLoading: false,
      apiError: '',
      converter: { amount: '', from: 'USD', to: 'EUR' },
      converterLoading: false,
      converterResult: '',
      converterError: false,
    };
  },
  computed: {
    balance() {
      return this.transactions.reduce(
        (sum, { amount, type }) => (type === 'дохід' ? sum + amount : sum - amount),
        0,
      );
    },
    formattedBalance() {
      const sign = this.balance > 0 ? '+' : this.balance < 0 ? '−' : '';
      return `${sign}${formatMoney(Math.abs(this.balance))}`;
    },
    // Нові операції зверху: спершу за датою, потім за id.
    sortedTransactions() {
      return [...this.transactions].sort(
        (a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id,
      );
    },
    totalIncome() {
      return this.transactions
        .filter(({ type }) => type === 'дохід')
        .reduce((sum, { amount }) => sum + amount, 0);
    },
    totalExpense() {
      return this.transactions
        .filter(({ type }) => type === 'витрата')
        .reduce((sum, { amount }) => sum + amount, 0);
    },
    spentPercent() {
      if (this.totalIncome === 0) {
        return this.totalExpense > 0 ? 100 : 0;
      }
      return Math.round((this.totalExpense / this.totalIncome) * 100);
    },
    budgetStatus() {
      if (this.balance < 0) {
        return `✗ Витрати перевищують дохід на ${formatMoney(-this.balance)}`;
      }
      return `✓ Бюджет у нормі — витрачено ${this.spentPercent}% доходу`;
    },
    // Сума витрат за категоріями — клієнтська агрегація масиву, отриманого через getAllItems().
    expensesByCategory() {
      const totals = this.transactions
        .filter(({ type }) => type === 'витрата')
        .reduce((acc, { category, amount }) => {
          acc[category] = (acc[category] || 0) + amount;
          return acc;
        }, {});

      return Object.entries(totals)
        .map(([category, total]) => {
          const tagClass = CATEGORY_TAGS[category.toLowerCase()] || 'tag--other';
          return {
            category,
            total,
            tagClass,
            color: categoryColor(category, tagClass),
          };
        })
        .sort((a, b) => b.total - a.total);
    },
    chartLabel() {
      if (this.expensesByCategory.length === 0) {
        return 'Діаграма витрат за категоріями: витрат немає';
      }
      const parts = this.expensesByCategory.map(({ category, total }) => (
        `${category} — ${Math.round((total / this.totalExpense) * 100)}%`
      ));
      return `Діаграма витрат за категоріями: ${parts.join(', ')}`;
    },
  },
  watch: {
    expensesByCategory(items) {
      this.chart.update(items);
    },
  },
  methods: {
    formatMoney,

    // Крок 9 + 11. Відкриття бази, міграція і перше завантаження списку.
    async initStorage() {
      this.storageLoading = true;

      if (FORCE_LOCAL_STORAGE) {
        this.useLocalStorage();
        this.storageNotice = 'Режим localStorage (?storage=local): дані зберігаються в Local Storage.';
        this.storageLoading = false;
        return;
      }

      try {
        await openDB();
        const migrated = await migrateFromLocalStorage();

        if (migrated > 0) {
          this.storageNotice = `Перенесено ${migrated} операцій із localStorage в IndexedDB.`;
        }

        await this.refreshTransactions();
      } catch (error) {
        console.error('IndexedDB недоступна:', error);
        this.storageError = 'Не вдалося відкрити базу даних браузера (IndexedDB). '
          + 'Можливо, увімкнено приватний режим або заборонено збереження даних сайтів. '
          + 'Операції тимчасово зберігатимуться в localStorage.';
        this.useLocalStorage();
      } finally {
        this.storageLoading = false;
      }
    },

    useLocalStorage() {
      this.storageMode = 'local';
      this.transactions = loadFromLocalStorage() || [];
    },

    // Після кожної CRUD-операції список перечитується з бази.
    async refreshTransactions() {
      this.transactions = await getAllItems();
    },

    // Крок 3. Запасний шлях: зберігаємо в localStorage після кожної зміни стану.
    persistLocal() {
      saveToLocalStorage(this.transactions);
    },

    // Додавання нової або збереження відредагованої операції.
    async addTransaction() {
      const { amount, type, category, date } = this.newTransaction;
      const record = {
        amount: Number(amount),
        type,
        category: category.trim(),
        date,
      };

      try {
        if (this.storageMode === 'idb') {
          if (this.editingId !== null) {
            await updateItem({ ...record, id: this.editingId });
          } else {
            await addItem(record); // id згенерує IndexedDB (autoIncrement)
          }
          await this.refreshTransactions();
        } else {
          if (this.editingId !== null) {
            this.transactions = this.transactions.map((t) => (
              t.id === this.editingId ? { ...record, id: this.editingId } : t
            ));
          } else {
            this.transactions.push({ ...record, id: Date.now() });
          }
          this.persistLocal();
        }

        this.cancelEdit();
      } catch (error) {
        console.error('Помилка збереження операції:', error);
        this.storageError = 'Не вдалося зберегти операцію. Спробуйте ще раз.';
      }
    },

    startEdit(transaction) {
      this.editingId = transaction.id;
      this.newTransaction = {
        amount: String(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date || todayISO(),
      };
      this.$nextTick(() => {
        this.$refs.amountInput.focus();
        this.$refs.amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },

    cancelEdit() {
      this.editingId = null;
      this.newTransaction = emptyTransaction();
    },

    // Додаткова валідація суми: нуль чи від'ємне значення → власне повідомлення
    validateAmount(event) {
      const input = event.target;

      if (input.value !== '' && Number(input.value) <= 0) {
        input.setCustomValidity('Сума має бути більшою за нуль');
      } else {
        input.setCustomValidity('');
      }

      input.reportValidity();
    },

    async removeTransaction(id) {
      try {
        if (this.storageMode === 'idb') {
          await deleteItem(id);
          await this.refreshTransactions();
        } else {
          this.transactions = this.transactions.filter((transaction) => transaction.id !== id);
          this.persistLocal();
        }

        if (this.editingId === id) {
          this.cancelEdit();
        }
      } catch (error) {
        console.error('Помилка видалення операції:', error);
        this.storageError = 'Не вдалося видалити операцію. Спробуйте ще раз.';
      }
    },

    removeApiTransaction(id) {
      this.apiTransactions = this.apiTransactions.filter((transaction) => transaction.id !== id);
    },

    async loadData() {
      this.apiLoading = true;
      this.apiError = '';

      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`Помилка HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);

        this.apiTransactions = data.map(({ id, name, body }) => ({
          id,
          amount: id * 10,
          type: 'витрата',
          category: name,
          comment: body,
        }));
      } catch (error) {
        this.apiError = 'Не вдалося завантажити операції. Перевірте з\'єднання з інтернетом і натисніть «Оновити».';
        console.error('Помилка завантаження операцій:', error);
      } finally {
        this.apiLoading = false;
      }
    },

    async convertCurrency() {
      const amount = Number(this.converter.amount);
      const { from, to } = this.converter;

      this.converterLoading = true;
      this.converterError = false;
      this.converterResult = 'Конвертація…';

      try {
        const response = await fetch(`${CONVERTER_URL}?amount=${amount}&from=${from}&to=${to}`);

        if (!response.ok) {
          throw new Error(`Помилка HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);

        this.converterResult = `${amount.toFixed(2)} ${from} = ${data.rates[to].toFixed(2)} ${to} (курс на ${data.date})`;
      } catch (error) {
        this.converterError = true;
        this.converterResult = 'Не вдалося конвертувати суму. Перевірте з\'єднання та оберіть різні валюти.';
        console.error('Помилка конвертації:', error);
      } finally {
        this.converterLoading = false;
      }
    },
  },
  mounted() {
    this.chart = new PieChart(this.$refs.chartCanvas);
    this.initStorage();
    this.loadData();
  },
  beforeUnmount() {
    this.chart.destroy();
  },
});

app.mount('#app');
