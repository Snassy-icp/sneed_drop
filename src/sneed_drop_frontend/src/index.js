import { sneed_drop_backend } from "../../declarations/sneed_drop_backend";
import { Principal } from "@dfinity/principal";

let div_log = document.getElementById("div_log");


function getSubaccount() {
  var result = new Uint8Array(32);
  var arr_sub = new Uint8Array(32);
  var cnt = 0;

  var st_sub = document.getElementById("txt_subaccount").value.toString();

  if (st_sub && st_sub.length > 0) {
    if (st_sub.indexOf(',') < 0) { st_sub += ','; }
    var arr = st_sub.split(',');

    for (var i = 0; i < arr.length; i++) {
      var st_val = arr[i];
      if (st_val) {

        st_val = st_val.trim();

        if (st_val.length > 0) {

          var i_val = parseInt(st_val);

          if (i_val) {
            if (i_val >= 0 && i_val <= 255) {
              arr_sub[cnt++] = i_val;
              if (cnt >= 32) {
                alert("Subaccount values out of range: A maximum of 32 values between 0 and 255 is allowed as a comma separated list."); 
                return -1; 
                //break;
              }
            } else { alert("Subaccount value out of range: " + i_val + ". Values must be between 0 and 255."); return -1; }
          }  
        }
      }
    }

    if (cnt > 0) { result = arr_sub; }

  }

  var sub = []; 
  sub[0] = arr_sub; 
  result = sub;

  return result;
}

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

async function clearErrorLog() {

  div_log.innerHTML += "<br />Deleting error log from memory...";
  var check = await sneed_drop_backend.clear_log();
  div_log.innerHTML += "<br />Done.";

}

async function getThenClearErrorLog() {

  var cnt_errors = await getErrorLog();
  if (cnt_errors > 0) {
    clearErrorLog();
  };

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

async function countBalancesTotal() {

  div_log.innerHTML += "<br />Checking current total supply for indexed account balances...";
  var check = await sneed_drop_backend.count_indexed_balances_total();
  div_log.innerHTML += "<br />Current total supply for indexed balances: " + check;

}

async function getErrorLog() {

  div_log.innerHTML += "<br />Getting current error log...";
  var log = await sneed_drop_backend.get_log();
  var i = 0;
  for (i = 0; i < log.length; i++) {
    div_log.innerHTML += "<br />" + log[i];
  }

  div_log.innerHTML += "<br />Done, with " + i + " items in error log.";

  return i;

}

async function getIndexedBalances() {

  div_log.innerHTML += "<br />Getting indexed balances...";
  var balances = await sneed_drop_backend.get_indexed_balances();
  var i = 0;
  for (i = 0; i < balances.length; i++) {
    let balance = balances[i];
    let bal = balance.account.owner + ', \"' + balance.account.subaccount + '\", ' + balance.balance; 
    div_log.innerHTML += "<br />" + bal;
  }

  div_log.innerHTML += "<br />Done.";

  return i;

}

async function getIndexedBalance() {

  let owner = document.getElementById("txt_owner").value;
  const subaccount = getSubaccount(); 
  if (subaccount && subaccount < 1) {
    return false;
  }
  
  let account = {
    "owner" : Principal.fromText(owner),
    "subaccount" : subaccount
  };

  var sub = "";
  if (subaccount) {
    sub = ", subaccount: " + subaccount;
  }

  div_log.innerHTML += "<br />Getting indexed balance for " + owner + sub + "...";
  var balance = await sneed_drop_backend.get_indexed_balance(account);
  div_log.innerHTML += "<br />Indexed balance for " + owner + sub + ": " + balance;

}

document.getElementById("btn_run_full").addEventListener("click", async (e) => {
  e.preventDefault();
  await clearTransactions();
  await countTransactions();
  await clearNeurons();
  await countNeurons();
  await clearBalances();
  await countBalances();
  await clearErrorLog();
  await importTransactions();
  await countTransactions();
  await importNeurons();
  await countNeurons();
  await indexTransactions();
  await getThenClearErrorLog();
  await countBalances();
  await countBalancesTotal();
  await unstakeNeurons();
  await getThenClearErrorLog();
  await countBalancesTotal();
  await getIndexedBalances();
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

document.getElementById("btn_clear_errors").addEventListener("click", async (e) => {
  e.preventDefault();
  clearErrorLog();
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

document.getElementById("btn_total_balance").addEventListener("click", async (e) => {
  e.preventDefault();
  countBalancesTotal();
  return false;
});

document.getElementById("btn_get_errors").addEventListener("click", async (e) => {
  e.preventDefault();
  getErrorLog();
  return false;
});

document.getElementById("btn_get_balances").addEventListener("click", async (e) => {
  e.preventDefault();
  getIndexedBalances();
  return false;
});

document.getElementById("btn_get_balance").addEventListener("click", async (e) => {
  e.preventDefault();
  getIndexedBalance();
  return false;
});


