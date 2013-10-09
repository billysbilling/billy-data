QUnit.module('Many-to-many relationships', {
    setup: function() {
        App.InvoicePaymentAssociation = BD.Model.extend({
            invoice: BD.belongsTo('App.Invoice'),
            payment: BD.belongsTo('App.InvoicePayment', {isParent: true})
        });
        App.Invoice = BD.Model.extend({
            paymentAssociations: BD.hasMany('App.InvoicePaymentAssociation', 'invoice')
        });
        App.InvoicePayment = BD.Model.extend({
            invoiceAssociations: BD.hasMany('App.InvoicePaymentAssociation', 'payment', {isEmbedded: true})
        });
        BD.store.load(App.Invoice, {
            id: 201,
            paymentAssociationIds: []
        });
        BD.store.load(App.InvoicePayment, {
            id: 301,
            invoiceAssociationIds: []
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('rollback() on parent should remove embedded child records from other parents', function() {
    var invoice = App.Invoice.find(201);
    var payment = App.InvoicePayment.createRecord({
    });
    var association = App.InvoicePaymentAssociation.createRecord({
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
    var invoice = App.Invoice.find(201);
    var payment = App.InvoicePayment.find(301);
    var association = App.InvoicePaymentAssociation.createRecord({
        invoice: invoice,
        payment: payment
    });
    equal(payment.get('isDirty'), true, 'Payment should be dirty');
    association.rollback();
    equal(payment.get('invoiceAssociations.length'), 0, 'The payment association should have been removed from the payment');
    equal(payment.get('isDirty'), false, 'Payment should be clean again');
});