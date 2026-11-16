// Обрано Vue: шаблони пишуться прямо в наявному HTML, а браузеру не потрібна компіляція JSX через Babel.

const API_URL = 'https://jsonplaceholder.typicode.com/comments?postId=2';
const CONVERTER_URL = 'https://api.frankfurter.dev/v1/latest';

// Функцію renderTransactions із практикуму 7 видалено: список тепер рендерить компонент ExpenseRow через v-for.

const ExpenseRow = {
  props: {
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
  },
  emits: ['remove'],
  methods: {
    remove() {
      this.$emit('remove');
    },
  },
  template: `
    <li class="transaction-item" :class="type === 'дохід' ? 'income' : 'expense'">
      <div class="transaction-item__row">
        <span class="transaction-item__text">{{ amount }} грн ({{ type }}, {{ category }})</span>
        <button type="button" class="transaction-item__remove" @click="remove">Видалити</button>
      </div>
      <slot></slot>
    </li>
  `,
};

const app = Vue.createApp({
  components: { ExpenseRow },
  data() {
    return {
      transactions: [
        { id: 1, amount: 1000, type: 'дохід', category: 'Стипендія' },
        { id: 2, amount: 150, type: 'витрата', category: 'Харчування' },
        { id: 3, amount: 30, type: 'витрата', category: 'Транспорт' },
        { id: 4, amount: 200, type: 'дохід', category: 'Підробіток' },
        { id: 5, amount: 75, type: 'витрата', category: 'Розваги' },
      ],
      newTransaction: { amount: '', type: '', category: '' },
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
      const sign = this.balance > 0 ? '+' : '';
      return `${sign}${this.balance.toFixed(2)} грн`;
    },
  },
  methods: {
    // Додавання нової операції: запис у масив, перемалювання списку й оновлення балансу
    addTransaction() {
      const { amount, type, category } = this.newTransaction;

      this.transactions.push({
        id: Date.now(),
        amount: Number(amount),
        type,
        category: category.trim(),
      });

      this.newTransaction = { amount: '', type: '', category: '' };
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

    removeTransaction(id) {
      this.transactions = this.transactions.filter((transaction) => transaction.id !== id);
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
    this.loadData();
  },
});

app.mount('#app');
