import { sneed_drop_backend } from "../../declarations/sneed_drop_backend";

async function importTransactions() {

  var from = 0;
  var batch_outer = 10000;
  var batch_inner = 1000;
  var max = 300000; // Get the 300,000 first transactions.

  let div_log = document.getElementById("div_log");

  while (from < max) {

    let to = BigInt(from + batch_outer);
    div_log.innerHTML += "<br />Importing transactions " + from + " - " + to + "...";
    await sneed_drop_backend.import_transactions(BigInt(from), to, batch_inner);
    from += batch_outer;
  }

  div_log.innerHTML += "<br />Done.";

}

document.getElementById("btn_test").addEventListener("click", async (e) => {
  e.preventDefault();
  importTransactions();
  return false;
});

