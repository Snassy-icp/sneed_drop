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
  
  div_log.innerHTML += "<br />Done importing " + last_id + " transactions.";

  div_log.innerHTML += "<br />Double check count of imported transactions...";
  var check = await sneed_drop_backend.imported_transactions_count();
  div_log.innerHTML += "<br />Imported transactions in memory: " + check;

  var match = check == last_id;

  if (match) {
    div_log.innerHTML += "<br />Match! Continuing process.";
  } else {
    div_log.innerHTML += "<br />Mismatch! Exiting process!";
  }

  return match;
}

document.getElementById("btn_run_full").addEventListener("click", async (e) => {
  e.preventDefault();
  var ok = ture;
  ok = importTransactions();
  return false;
});


document.getElementById("btn_import_tx").addEventListener("click", async (e) => {
  e.preventDefault();
  importTransactions();
  return false;
});


