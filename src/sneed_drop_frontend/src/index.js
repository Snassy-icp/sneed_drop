import { sneed_drop_backend } from "../../declarations/sneed_drop_backend";

async function importTransactions() {

  var from = 0;
  var batch_outer = 10000;
  var batch_inner = 1000;
  var max = 30000; //300000; // Get the 300,000 first transactions.

  let div_log = document.getElementById("div_log");
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

  let div_log = document.getElementById("div_log");

  while (cnt_imported < max && !stop) {

    div_log.innerHTML += "<br />Importing neurons " + cnt_imported + " - " + (cnt_imported + batch_outer) + "...";
    start_id = await sneed_drop_backend.import_neurons(start_id, batch_outer, batch_inner);

    if (start_id[0].id.length < 1) {
      stop = true;
    } 

    cnt_imported += batch_outer;

  }

  div_log.innerHTML += "<br />Done importing up to " + cnt_imported + " neurons.";

  div_log.innerHTML += "<br />Double check count of imported neurons...";
  var check = await sneed_drop_backend.imported_neurons_count();
  div_log.innerHTML += "<br />Imported neurons in memory: " + check;

  var match = check == cnt_imported;

  if (match) {
    div_log.innerHTML += "<br />Match! Continuing process.";
  } else {
    div_log.innerHTML += "<br />Mismatch! Exiting process!";
  }

  return match;

}

async function countNeurons() {

  div_log.innerHTML += "<br />Checking current number of imported neurons...";
  var check = await sneed_drop_backend.imported_neurons_count();
  div_log.innerHTML += "<br />There are currently: " + check + " imported neurons in memory.";

}

document.getElementById("btn_run_full").addEventListener("click", async (e) => {
  e.preventDefault();
  importTransactions();
  countTransactions();
  importNeurons();
  countNeurons();
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


