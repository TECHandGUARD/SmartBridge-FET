import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingRequest} from '../src/lib/booking-request.js';
test('switching funding sources creates a new booking intent; retries preserve the original request',()=>{
 const tutor={id:'tutor'},form={subject:'Mathematics',date:'2099-01-01',time:'10:00',duration_hours:1};
 const ordinary=bookingRequest(null,tutor,form),sponsored=bookingRequest(ordinary,tutor,{...form,sponsorship_allocation_id:'award-one'});
 assert.notEqual(ordinary.id,sponsored.id);
 assert.equal(bookingRequest(sponsored,tutor,{...form,sponsorship_allocation_id:'award-one'}).id,sponsored.id);
 assert.notEqual(bookingRequest(sponsored,tutor,{...form,sponsorship_allocation_id:'award-two'}).id,sponsored.id);
 const intro=bookingRequest(null,tutor,{...form,is_intro:true});
 assert.equal(bookingRequest(intro,tutor,{...form,is_intro:true,sponsorship_allocation_id:'ignored'}).id,intro.id);
});
