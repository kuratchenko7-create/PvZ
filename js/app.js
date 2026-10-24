console.log('script.js підключено');

document.querySelector('.static-example').remove();

// Масив операцій: сума та тип ('дохід' або 'витрата')
const transactions = [
  { amount: 1000, type: 'дохід' },
  { amount: 150, type: 'витрата' },
  { amount: 30, type: 'витрата' },
  { amount: 200, type: 'дохід' },
  { amount: 75, type: 'витрата' },
];

const listContainer = document.querySelector('#transactions-list');

function renderTransactions(list) {
  list.forEach(({ amount, type }) => {
    const item = document.createElement('li');
    item.classList.add('transaction-item');
    item.classList.add(type === 'дохід' ? 'income' : 'expense');
    item.dataset.amount = amount;

    const text = document.createElement('span');
    text.classList.add('transaction-item__text');
    text.textContent = `${amount} грн (${type})`;

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
const sign = balance > 0 ? '+' : '';
balanceElement.textContent = `${sign}${balance.toFixed(2)} грн`;