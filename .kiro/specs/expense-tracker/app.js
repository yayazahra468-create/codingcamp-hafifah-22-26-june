// ===============================
// Expense Tracker
// ===============================

const form = document.getElementById("expense-form");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");

const transactionList = document.getElementById("transaction-list");
const balance = document.getElementById("balance");

const STORAGE_KEY = "expense_tracker_data";

let transactions = [];
let expenseChart = null;

// ===============================
// Load Data
// ===============================

function loadTransactions() {
    const data = localStorage.getItem(STORAGE_KEY);

    if (data) {
        transactions = JSON.parse(data);
    } else {
        transactions = [];
    }

    renderAll();
}

// ===============================
// Save Data
// ===============================

function saveTransactions() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
    );
}

// ===============================
// Add Transaction
// ===============================

function addTransaction(name, amount, category) {

    const transaction = {

        id: Date.now(),

        name: name,

        amount: Number(amount),

        category: category

    };

    transactions.push(transaction);

    saveTransactions();

    renderAll();

}

// ===============================
// Delete Transaction
// ===============================

function deleteTransaction(id) {

    transactions = transactions.filter(item => item.id !== id);

    saveTransactions();

    renderAll();

}

// ===============================
// Total Balance
// ===============================

function calculateBalance() {

    let total = 0;

    transactions.forEach(item => {

        total += item.amount;

    });

    return total;

}

// ===============================
// Render Balance
// ===============================

function renderBalance() {

    balance.textContent =
        "$" + calculateBalance().toFixed(2);

}
// ===============================
// Render Transaction List
// ===============================

function renderTransactions() {

    transactionList.innerHTML = "";

    if (transactions.length === 0) {

        transactionList.innerHTML =
            "<p>No transactions yet.</p>";

        return;

    }

    transactions.forEach(item => {

        const div = document.createElement("div");

        div.className = "transaction-item";

        div.innerHTML = `

            <div>

                <strong>${item.name}</strong><br>

                <small>${item.category}</small>

            </div>

            <div>

                <strong>$${item.amount.toFixed(2)}</strong>

                <button onclick="deleteTransaction(${item.id})">

                    Delete

                </button>

            </div>

        `;

        transactionList.appendChild(div);

    });

}

// ===============================
// Pie Chart
// ===============================

function renderChart() {

    const ctx = document
        .getElementById("pie-chart")
        .getContext("2d");

    const food = transactions
        .filter(item => item.category === "Food")
        .reduce((sum, item) => sum + item.amount, 0);

    const transport = transactions
        .filter(item => item.category === "Transport")
        .reduce((sum, item) => sum + item.amount, 0);

    const fun = transactions
        .filter(item => item.category === "Fun")
        .reduce((sum, item) => sum + item.amount, 0);

    if (expenseChart) {

        expenseChart.destroy();

    }

    expenseChart = new Chart(ctx, {

        type: "pie",

        data: {

            labels: [

                "Food",

                "Transport",

                "Fun"

            ],

            datasets: [{

                data: [

                    food,

                    transport,

                    fun

                ]

            }]

        },

        options: {

            responsive: true,

            plugins: {

                legend: {

                    position: "bottom"

                }

            }

        }

    });

}

// ===============================
// Render All
// ===============================

function renderAll() {

    renderBalance();

    renderTransactions();

    renderChart();

}
// ===============================
// Form Submit
// ===============================

form.addEventListener("submit", function (event) {

    event.preventDefault();

    const name = nameInput.value.trim();

    const amount = parseFloat(amountInput.value);

    const category = categoryInput.value;

    if (name === "") {
        alert("Please enter an item name.");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert("Amount must be greater than 0.");
        return;
    }

    if (category === "") {
        alert("Please select a category.");
        return;
    }

    addTransaction(name, amount, category);

    form.reset();

});

// ===============================
// Make deleteTransaction Global
// ===============================

window.deleteTransaction = deleteTransaction;

// ===============================
// Start Application
// ===============================

loadTransactions();