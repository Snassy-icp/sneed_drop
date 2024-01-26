import { sneed_drop_backend } from "../../declarations/sneed_drop_backend";

let div_log = document.getElementById("div_log");

async function clearTransactions() {

  div_log.innerHTML += "<br />Deleting all imported transactions from memory...";
  var check = await sneed_drop_backend.clear_imported_transactions();
  div_log.innerHTML += "<br />Done.";

}

async function clearNeurons() {

  div_log.innerHTML += "<br />Deleting all imported neurons from memory...";
  var check = await sneed_drop_backend.clear_imported_neurons();
  div_log.innerHTML += "<br />Done.";

}

async function clearBalances() {

  div_log.innerHTML += "<br />Deleting all indexed balances from memory...";
  var check = await sneed_drop_backend.clear_indexed_balances();
  div_log.innerHTML += "<br />Done.";

}

async function importTransactions() {

  var from = 0;
  var batch_outer = 10000;
  var batch_inner = 1000;
  var max = 30000; //300000; // Get the 300,000 first transactions.

  var last_id = 0;

  while (from < max) {

    let to = BigInt(from + batch_outer);
    div_log.innerHTML += "<br />Importing transactions " + from + " - " + to + "...";
    last_id = await sneed_drop_backend.import_transactions(BigInt(from), to, batch_inner);
    from += batch_outer;

  }
  
  div_log.innerHTML += "<br />Done.";
}

async function countTransactions() {

  div_log.innerHTML += "<br />Checking current number of imported transactions...";
  var check = await sneed_drop_backend.imported_transactions_count();
  div_log.innerHTML += "<br />There are currently: " + check + " imported transactions in memory.";

}

async function importNeurons() {

  var start_id = [{ id: [] }];
  var cnt_imported = 0;
  var batch_outer = 1000;
  var batch_inner = 100;
  var max = 12000;
  var stop = false;

  while (cnt_imported < max && !stop) {

    div_log.innerHTML += "<br />Importing neurons " + cnt_imported + " - " + (cnt_imported + batch_outer) + "...";
    start_id = await sneed_drop_backend.import_neurons(start_id, batch_outer, batch_inner);

    if (start_id[0].id.length < 1) {
      stop = true;
    } 

    cnt_imported += batch_outer;

  }

  div_log.innerHTML += "<br />Done.";

}

async function countNeurons() {

  div_log.innerHTML += "<br />Checking current number of imported neurons...";
  var check = await sneed_drop_backend.imported_neurons_count();
  div_log.innerHTML += "<br />There are currently: " + check + " imported neurons in memory.";

}

async function indexTransactions() {

  var i = 0;
  var batch_outer = 100000;
  var max = 300000;
  var stop = false;
  var last_id = 0;
  var cutoff = [];

  cutoff [0] = BigInt(new Date(document.getElementById("txt_cutoff").value).valueOf() + '000000');

  while (i < max && !stop) {
 
    div_log.innerHTML += "<br />Indexing transactions " + i + " - " + (i + batch_outer) + "...";
    last_id = await sneed_drop_backend.index_transactions(i, i + batch_outer, cutoff);
    i += batch_outer;
 
    if (last_id < i) {
      stop = true;
    }
 
  }

  div_log.innerHTML += "<br />Done indexing " + last_id + " transactions.";

}

async function countBalances() {

  div_log.innerHTML += "<br />Checking current number of indexed account balances...";
  var check = await sneed_drop_backend.indexed_balances_count();
  div_log.innerHTML += "<br />There are currently: " + check + " indexed account balances in memory.";

}

async function unstakeNeurons() {

  div_log.innerHTML += "<br />Transfer neuron balances to owning principals...";
  await sneed_drop_backend.unstake_neuron_balances();
  div_log.innerHTML += "<br />Done.";

}

document.getElementById("btn_run_full").addEventListener("click", async (e) => {
  e.preventDefault();
  clearTransactions();
  countTransactions();
  clearNeurons();
  countNeurons();
  clearBalances();
  countBalances();
  importTransactions();
  countTransactions();
  importNeurons();
  countNeurons();
  indexTransactions();
  countBalances();
  unstakeNeurons();
  return false;
});

document.getElementById("btn_clear_tx").addEventListener("click", async (e) => {
  e.preventDefault();
  clearTransactions();
  return false;
});

document.getElementById("btn_clear_neurons").addEventListener("click", async (e) => {
  e.preventDefault();
  clearNeurons();
  return false;
});

document.getElementById("btn_clear_balances").addEventListener("click", async (e) => {
  e.preventDefault();
  clearBalances();
  return false;
});

document.getElementById("btn_import_tx").addEventListener("click", async (e) => {
  e.preventDefault();
  importTransactions();
  return false;
});

document.getElementById("btn_count_tx").addEventListener("click", async (e) => {
  e.preventDefault();
  countTransactions();
  return false;
});

document.getElementById("btn_import_neurons").addEventListener("click", async (e) => {
  e.preventDefault();
  importNeurons();
  return false;
});

document.getElementById("btn_count_neurons").addEventListener("click", async (e) => {
  e.preventDefault();
  countNeurons();
  return false;
});

document.getElementById("btn_index_tx").addEventListener("click", async (e) => {
  e.preventDefault();
  indexTransactions();
  return false;
});

document.getElementById("btn_count_balances").addEventListener("click", async (e) => {
  e.preventDefault();
  countBalances();
  return false;
});

document.getElementById("btn_unstake_neurons").addEventListener("click", async (e) => {
  e.preventDefault();
  unstakeNeurons();
  return false;
});


