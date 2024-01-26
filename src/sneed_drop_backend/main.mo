import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Hash "mo:base/Hash";
import Map "mo:base/HashMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Itertools "mo:itertools/Iter";
import ArrayModule "mo:array/Array";

actor {

  public type TxIndex = Nat;
  public type Account = { owner : Principal; subaccount : ?Blob };
  public type EncodedAccount = Blob;
  public type Balance = Nat;
  public type Log = Buffer.Buffer<Text>;

  public type AccountBalance = {
    account : Account;
    balance : Balance;
  };

  public type Transaction = {
    burn : ?{
      from : Account;
      memo : ?Blob;
      created_at_time : ?Nat64;
      amount : Nat;
    };
    kind : Text;
    mint : ?{
      to : Account;
      memo : ?Blob;
      created_at_time : ?Nat64;
      amount : Nat;
    };
    timestamp : Nat64;
    transfer : ?{
      to : Account;
      from : Account;
      memo : ?Blob;
      created_at_time : ?Nat64;
      amount : Nat;
    };
  };

  // Persistent state variables (the state in these survive canister upgrades)
  // These variables are used to stash away state from transient state variables 
  // during canister upgrades so it is not destroyed.
  
  // Imported transactions (stable)
  stable var stable_transactions : [(TxIndex, Transaction)] = []; 

  // Indexed account balances (stable)
  stable var stable_balances : [(EncodedAccount, Balance)] = [];

  // Log messages (stable)
  stable var stable_log : [Text] = [];

  // Transient state variables (the state in these do not survive canister upgrades)
  // On canister startup the state for these transient variables will be read from the 
  // persistent state variables where it is stashed away during canister upgrades.
  
  // Imported transactions
  var transactions = Map.fromIter<TxIndex, Transaction>(stable_transactions.vals(), 100, Int.equal, Hash.hash);

  // Indexed account balances
  var balances = Map.fromIter<EncodedAccount, Nat>(stable_balances.vals(), 10, Blob.equal, Blob.hash);

  // Log messages  
  var log : Log = Buffer.fromArray<Text>(stable_log);

  // Constant state

  // The SNS1 Swap canister's principal
  let sns1_swap = Principal.fromText("zcdfx-6iaaa-aaaaq-aaagq-cai");

  // The SNS1 Governance canister's principal
  let sns1_gov = Principal.fromText("zqfso-syaaa-aaaaq-aaafq-cai");

  // The SNS1 archive canister, with its get_transactions method 
  // that we will call to import transactions.
  let sns1_archive = actor ("zmbi7-fyaaa-aaaaq-aaahq-cai") : actor {
    get_transactions : shared query { start : Nat; length : Nat } -> async {
        transactions : [Transaction];
      };
  };  

  // The SNS1 transaction fee 
  let fee_e8s = 1000;


  // System Function //
  // Runs before the canister is upgraded
  system func preupgrade() {

    // Move transient state into persistent state before upgrading the canister,
    // stashing it away so it survives the canister upgrade.
    stable_transactions := Iter.toArray(transactions.entries());
    stable_balances := Iter.toArray(balances.entries());
    stable_log := Buffer.toArray(log);

  };

  // System Function //
  // Runs after the canister is upgraded
  system func postupgrade() {

    // Clear persistent state (stashed away transient state) after upgrading the canister
    stable_transactions := [];
    stable_balances := [];
    stable_log := [];

  };

  // Public API //

  // Returns the number of imported transactions
  public shared func imported_transactions_count() : async Nat { transactions.size(); };

  // Returns the number of indexed balances
  public shared func indexed_balances_count() : async Nat { balances.size(); };

  // Clears all imported transactions
  public shared func clear_imported() : async () { for (key in transactions.keys()) { transactions.delete(key); }; };

  // Clears all indexed balances
  public shared func clear_balances() : async () { for (key in balances.keys()) { balances.delete(key); }; };

  // Clear log
  public shared func clear_log() : async () { log.clear(); };

  // Returns the indexing log
  public shared func get_log() : async [Text] { Buffer.toArray<Text>(log); };

  // Import transactions from SNS1 archive canister and store them in local state variables.
  // "from" takes the first transaction index to start importing from.
  // "to" takes the last transaction index to import.
  // "batch_size" specifies how many transactions to ask for per call to the SNS1 archive canister.
  // NB: This code currently only supports one archive canister.
  // TODO: Add support for multiple archive canisters (but not needed for NTN -> SNS1 airdrop)
  public shared func import_transactions(from : TxIndex, to : TxIndex, batch_size: Nat) : async () {

    // Make sure the "to" parameter contains a greater transaction index than the "from" parameter.
    assert to > from;

    // We start importing from the transaction index specified in the "from" parameter.
    var curr = from;

    // We keep iterating until we reach the index specified in the "to" parameter.
    while (curr <= to) {

      // Call the SNS1 archive canister, asking for the transactions starting at our current index.      
      let result = await sns1_archive.get_transactions({ start = curr; length = batch_size; });

      // Track the transaction index.
      var i = curr;

      // Iterate over the transactions in the result and copy them to local storage. 
      for (tx in result.transactions.vals()) {        
        transactions.put(i, tx);
        i := i + 1;
      };

      // Increase the current transaction index by the batch size.
      curr := curr + batch_size;
    };
    
  };

  // Index imported transactions, determining account balances.
  // "from" takes the first transaction index to start indexing from. 
  // Should normally be 0, other values only make sense during testing runs.
  // "to" takes the last transaction index to index. 
  public shared func index_transactions(from : TxIndex, to : TxIndex) : async () {

    var i = from;

    while (i < to) {
      switch (transactions.get(i)) {
        case (null) { log_msg("Missing transaction. Transaction: " # Nat.toText(i)); };
        case (?tx) { index_transaction(tx, i); };
      };
      
      i := i + 1;
    }
  };

  // Return the indexed balances. 
  public shared func get_balances() : async [AccountBalance] {
    Array.sort(
      Iter.toArray(
        Map.mapFilter<EncodedAccount, Balance, AccountBalance>(
          balances, 
          Blob.equal,
          Blob.hash,
          func(encoded : EncodedAccount, balance : Balance) : ?AccountBalance { 
            if (balance == 0) { return null; };

            let account = decode(encoded);
            switch (account) {
              case (null) { return null; };
              case (?acct) {
                if (acct.owner == sns1_gov) { return null; };

                return ?{ 
                  account = acct; 
                  balance = balance;
                };
              };
            };
          }).vals()), compareAccountBalancesDesc);
  };

  // Compare two AccountBalances for a descending sort.
  private func compareAccountBalancesDesc(x : AccountBalance, y : AccountBalance) : { #less; #equal; #greater } {
    if (y.balance < x.balance) { #less } else if (x.balance == y.balance) { #equal } else { #greater }
  };


  // Index a transaction.
  private func index_transaction(tx : Transaction, i : TxIndex) : () {

    if (tx.kind == "mint") { index_mint(tx, i); }
    else if (tx.kind == "burn") { index_burn(tx, i); }
    else if (tx.kind == "transfer") { index_transfer(tx, i); }
    else { log_msg("Unknown transaction kind: " # tx.kind); };

  };

  private func index_mint(tx : Transaction, i : TxIndex) : () {
    switch (tx.mint) {
      case (null) { log_msg("Mint transaction missing mint information value. Transaction: " # Nat.toText(i)); };
      case (?mint) { 

          increase_balance(mint.to, mint.amount);
          
      };
    };
  };

  private func index_burn(tx : Transaction, i : TxIndex) : () {
    switch (tx.burn) {
      case (null) { log_msg("Burn transaction missing burn information value. Transaction: " # Nat.toText(i)); };
      case (?burn) { 

          decrease_balance(burn.from, burn.amount, i);
          
      };
    };
  };

  private func index_transfer(tx : Transaction, i : TxIndex) : () {

    switch (tx.transfer) {
      case (null) { log_msg("Transfer transaction missing transfer information value. Transaction: " # Nat.toText(i)); };
      case (?transfer) { 

          decrease_balance(transfer.from, transfer.amount + fee_e8s, i);
          increase_balance(transfer.to, transfer.amount);

      };
    };
  };

  private func get_balance(account : Account) : Balance {
    let encoded = encode(account);
    switch (balances.get(encoded)) {
      case (null) { 0; };
      case (?balance) { balance; };
    };
  };

  private func increase_balance(account : Account, amount : Nat) : () {
    let encoded = encode(account);
    switch (balances.get(encoded)) {
      case (null) { balances.put(encoded, amount); };
      case (?balance) { balances.put(encoded, balance + amount); };
    };
  };

  private func decrease_balance(account : Account, amount : Nat, i : TxIndex) : () {
    let encoded = encode(account);
    switch (balances.get(encoded)) {
      case (null) { 
        balances.put(encoded, 0); 
        log_msg("Negative balance! Tried to subtract from null balance in account: " # Principal.toText(account.owner) # ", transaction: " # Nat.toText(i));
      };
      case (?balance) { 
        if (amount > balance) { 
          balances.put(encoded, 0); 
          log_msg("Negative balance! Tried to subtract from insufficient balance in account: " # Principal.toText(account.owner) # ", transaction: " # Nat.toText(i)); 
        } else {
          balances.put(encoded, balance - amount); 
        };
      };
    };
  };

  private func log_msg(msg : Text) {
    log.add(msg);
  };


  // CODE FOR ENCODING AND DECODING ACCOUNTS //
  // Taken from https://github.com/NatLabs/icrc1/blob/main/src/ICRC1/Account.mo
  func encode_subaccount(sub : Blob) : Iter.Iter<Nat8> {

      let (sub_iter, size) = shrink_subaccount(sub);
      if (size == 0) {
          return Itertools.empty();
      };

      let suffix : [Nat8] = [size, 0x7f];

      Itertools.chain<Nat8>(
          sub_iter,
          suffix.vals(),
      );
  };

  /// Implementation of ICRC1's Textual representation of accounts [Encoding Standard](https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1#encoding)
  private func encode({ owner; subaccount } : Account) : EncodedAccount {
      let owner_blob = Principal.toBlob(owner);

      switch (subaccount) {
          case (?subaccount) {
              Blob.fromArray(
                  Iter.toArray(
                      Itertools.chain(
                          owner_blob.vals(),
                          encode_subaccount(subaccount),
                      ),
                  ),
              );
          };
          case (_) {
              owner_blob;
          };
      };
  };

  /// Implementation of ICRC1's Textual representation of accounts [Decoding Standard](https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1#decoding)
  private func decode(encoded : EncodedAccount) : ?Account {
      let bytes = Blob.toArray(encoded);
      var size = bytes.size();

      if (bytes[size - 1] == 0x7f) {
          size -= 1;

          let subaccount_size = Nat8.toNat(bytes[size - 1]);

          if (subaccount_size == 0 or subaccount_size > 32) {
              return null;
          };

          size -= 1;
          let split_index = (size - subaccount_size) : Nat;

          if (bytes[split_index] == 0) {
              return null;
          };

          let principal = Principal.fromBlob(
              Blob.fromArray(
                  ArrayModule.slice(bytes, 0, split_index),
              ),
          );

          let prefix_zeroes = Itertools.take(
              Iter.make(0 : Nat8),
              (32 - subaccount_size) : Nat,
          );

          let encoded_subaccount = Itertools.fromArraySlice(bytes, split_index, size);

          let subaccount = Blob.fromArray(
              Iter.toArray(
                  Itertools.chain(prefix_zeroes, encoded_subaccount),
              ),
          );

          ?{ owner = principal; subaccount = ?subaccount };
      } else {
          ?{
              owner = Principal.fromBlob(encoded);
              subaccount = null;
          };
      };
  };

  func shrink_subaccount(sub : Blob) : (Iter.Iter<Nat8>, Nat8) {
      let bytes = Blob.toArray(sub);
      var size = Nat8.fromNat(bytes.size());

      let iter = Itertools.skipWhile(
          bytes.vals(),
          func(byte : Nat8) : Bool {
              if (byte == 0x00) {
                  size -= 1;
                  return true;
              };

              false;
          },
      );

      (iter, size);
  };


};
