var Invoice,
    InvoicePayment,
    InvoicePaymentAssociation;

module('Billy Data many-to-many relationships', {
    setup: function() {
        InvoicePaymentAssociation = BD.Model.extend({
        });
        Invoice = BD.Model.extend({
            paymentAssociations: BD.hasMany(InvoicePaymentAssociation, 'invoice')
        });
        InvoicePayment = BD.Model.extend({
            invoiceAssociations: BD.hasMany(InvoicePaymentAssociation, 'payment', {isEmbedded: true})
        });
        InvoicePaymentAssociation.reopen({
            invoice: BD.belongsTo(Invoice),
            payment: BD.belongsTo(InvoicePayment, {isParent: true})
        });
        BD.store.load(Invoice, {
            id: 201,
            paymentAssociationIds: []
        });
        BD.store.load(InvoicePayment, {
            id: 301,
            invoiceAssociationIds: []
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('rollback() on parent should remove embedded child records from other parents', function() {
    var invoice = Invoice.find(201);
    var payment = InvoicePayment.createRecord({
    });
    var association = InvoicePaymentAssociation.createRecord({
        invoice: invoice,
        payment: payment
    });
    equal(invoice.get('paymentAssociations.length'), 1, 'Invoice should have one payment association');
    equal(payment.get('invoiceAssociations.length'), 1, 'Payment should have one invoice association');
    equal(invoice.get('isDirty'), false, 'Invoice should be clean');
    equal(payment.get('isDirty'), true, 'Payment should be dirty');
    equal(association.get('isDirty'), true, 'InvoicePaymentAssociation should be dirty');
    payment.rollback();
    equal(invoice.get('paymentAssociations.length'), 0, 'The payment association should have been removed from the invoice');
});

test('rollback() on embedded child should clean parent', function() {
    var invoice = Invoice.find(201);
    var payment = InvoicePayment.find(301);
    var association = InvoicePaymentAssociation.createRecord({
        invoice: invoice,
        payment: payment
    });
    equal(payment.get('isDirty'), true, 'Payment should be dirty');
    association.rollback();
    equal(payment.get('invoiceAssociations.length'), 0, 'The payment association should have been removed from the payment');
    equal(payment.get('isDirty'), false, 'Payment should be clean again');
});