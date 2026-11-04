console.log('script.js підключено');

document.querySelector('.static-example').remove();

// Масив операцій: сума, тип ('дохід' або 'витрата') та категорія
const transactions = [
  { amount: 1000, type: 'дохід', category: 'Стипендія' },
  { amount: 150, type: 'витрата', category: 'Харчування' },
  { amount: 30, type: 'витрата', category: 'Транспорт' },
  { amount: 200, type: 'дохід', category: 'Підробіток' },
  { amount: 75, type: 'витрата', category: 'Розваги' },
];

const listContainer = document.querySelector('#transactions-list');

function renderTransactions(list) {
  listContainer.replaceChildren();

  list.forEach(({ amount, type, category }) => {
    const item = document.createElement('li');
    item.classList.add('transaction-item');
    item.classList.add(type === 'дохід' ? 'income' : 'expense');
    item.dataset.amount = amount;

    const text = document.createElement('span');
    text.classList.add('transaction-item__text');
    text.textContent = `${amount} грн (${type}, ${category})`;

    item.append(text);
    listContainer.append(item);
  });
}

renderTransactions(transactions);

const toPercent = (part, total) => Math.round(part / total * 100);

function calculateBalance(list) {
  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (let i = 0; i < list.length; i++) {
    const { amount, type } = list[i];
    if (type === 'дохід') {
      balance += amount;
      totalIncome += amount;
    } else {
      balance -= amount;
      totalExpense += amount;
    }
  }

  console.log(`Кількість операцій: ${list.length}`);
  console.log(`Загальний дохід: ${totalIncome} грн`);
  console.log(`Загальні витрати: ${totalExpense} грн`);
  console.log(`Підсумковий баланс: ${balance} грн`);

  return { balance, totalIncome, totalExpense };
}

function classifyBalance(balance) {
  if (balance > 0) {
    console.log('Баланс додатний');
  } else {
    console.log('Баланс не додатний');
  }
}

const { balance, totalIncome, totalExpense } = calculateBalance(transactions);
classifyBalance(balance);
console.log(`Витрачено ${toPercent(totalExpense, totalIncome)}% доходу`);

const balanceElement = document.querySelector('#balance');

function renderBalance(value) {
  const sign = value > 0 ? '+' : '';
  balanceElement.textContent = `${sign}${value.toFixed(2)} грн`;
}

renderBalance(balance);

const form = document.querySelector('#transaction-form');
const amountInput = document.querySelector('#transaction-amount');
const typeSelect = document.querySelector('#transaction-type');
const categoryInput = document.querySelector('#transaction-category');

// Додавання нової операції: запис у масив, перемалювання списку й оновлення балансу
form.addEventListener('submit', (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);
  const type = typeSelect.value;
  const category = categoryInput.value.trim();

  transactions.push({ amount, type, category });

  renderTransactions(transactions);
  renderBalance(calculateBalance(transactions).balance);

  form.reset();
});

// Додаткова валідація суми: нуль чи від'ємне значення → власне повідомлення
amountInput.addEventListener('input', () => {
  const value = Number(amountInput.value);

  if (amountInput.value !== '' && value <= 0) {
    amountInput.setCustomValidity('Сума має бути більшою за нуль');
  } else {
    amountInput.setCustomValidity('');
  }

  amountInput.reportValidity();
});