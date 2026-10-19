const amount = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value)) : 0;
export function paymentOrderSummary(orders) {
  const paid = orders.filter(order => order.status === 'paid');
  const sum = rows => rows.reduce((total, order) => total + amount(order.amount_cents), 0) / 100;
  const live = paid.filter(order => order.mode === 'live' && order.refund_status !== 'refunded');
  const test = paid.filter(order => order.mode === 'test');
  return {
    liveReceipts: sum(live),
    liveBookingReceipts: sum(live.filter(order => order.product === 'booking')),
    liveSubscriptionReceipts: sum(live.filter(order => ['student', 'parent', 'tutor_pro'].includes(order.product))),
    testPayments: test.length,
    testPaymentValue: sum(test),
    testRefundedValue: sum(test.filter(order => order.refund_status === 'refunded')),
    testRefundsAwaitingConfirmation: test.filter(order => ['requested', 'pending'].includes(order.refund_status)).length,
  };
}
export function bookingActivitySummary(bookings) {
  const test = bookings.filter(booking => booking.payment_status === 'test_paid' || (booking.payment_mode === 'test' && booking.payment_status === 'refunded'));
  return {
    total: bookings.length,
    confirmed: bookings.filter(booking => booking.status === 'confirmed').length,
    completed: bookings.filter(booking => booking.status === 'completed').length,
    cancelled: bookings.filter(booking => booking.status === 'cancelled').length,
    testPayments: test.length,
    testPaymentValue: test.reduce((total, booking) => total + amount(Number(booking.amount) * 100), 0) / 100,
    testRefunds: test.filter(booking => booking.payment_status === 'refunded').length,
  };
}
export async function loadPaymentOrders(client) {
  const orders = [];
  for (let start = 0; ; start += 500) {
    const {data, error} = await client.from('payment_orders').select('id,product,status,mode,amount_cents,refund_status').order('created_at', {ascending: false}).order('id').range(start, start + 499);
    if (error) throw error;
    orders.push(...(data || []));
    if (!data || data.length < 500) return orders;
  }
}
