class Payment {
  constructor({
    user_id,
    amount,
    currency = "USD",
    status = Payment.STATUS.PENDING,
    session_id
  }) {

    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!amount || amount <= 0) {
      throw new Error("Valid amount required");
    }

    this.user_id = user_id;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.stripe_session_id = session_id;
    this.created_at = new Date();
  }

  updateStatus(status){
    this.status = status;
  }

  isPaid(){
    return this.status === Payment.STATUS.SUCCESS;
  }

  toJSON(){
    return {
      user_id: this.user_id,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      stripe_session_id: this.stripe_session_id,
      created_at: this.created_at
    };
  }

  static STATUS = {
    PENDING: "pending",
    SUCCESS: "success",
    FAILED: "failed"
  }
}

module.exports = Payment;