console.log('script.js підключено');

// Масив операцій: сума та тип ('дохід' або 'витрата')
const transactions = [
  { amount: 1000, type: 'дохід' },
  { amount: 150, type: 'витрата' },
  { amount: 30, type: 'витрата' },
  { amount: 200, type: 'дохід' },
  { amount: 75, type: 'витрата' },
];

// Обчислює відсоток частини від загального значення (округлено до цілого)
const toPercent = (part, total) => Math.round(part / total * 100);

// Проходить циклом for по операціях, рахує баланс, дохід і витрати та виводить підсумок у консоль
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

// Позначає, чи підсумковий баланс додатний
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