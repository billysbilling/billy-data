QUnit.module('BD');

test('Pluralizer', function() {
    equal(BD.pluralize('invoice'), 'invoices');
    equal(BD.pluralize('invoiceLine'), 'invoiceLines');
    equal(BD.pluralize('country'), 'countries');
    equal(BD.pluralize('currency'), 'currencies');
    equal(BD.pluralize('access'), 'accesses');
    equal(BD.pluralize('batch'), 'batches');
    equal(BD.pluralize('bankLineMatch'), 'bankLineMatches');
});

test('Singularizer', function() {
    equal(BD.singularize('invoices'), 'invoice');
    equal(BD.singularize('invoiceLines'), 'invoiceLine');
    equal(BD.singularize('countries'), 'country');
    equal(BD.singularize('currencies'), 'currency');
    equal(BD.singularize('accesses'), 'access');
    equal(BD.singularize('batches'), 'batch');
    equal(BD.singularize('bankLineMatches'), 'bankLineMatch');
});

test('Inflector rules', function() {
    BD.addInflectorsRule('foo', 'bar');
    equal(BD.pluralize('foo'), 'bar');
    equal(BD.singularize('bar'), 'foo');
    BD.removeInflectorsRule('foo');

    BD.addInflectorsRule('foo2', 'bars');
    BD.removeInflectorsRule('foo2');
    equal(BD.pluralize('foo'), 'foos');
    equal(BD.singularize('bars'), 'bar');
});

test('Classify', function() {
    equal(BD.classify('invoice'), 'Invoice');
    equal(BD.classify('bankLineMatch'), 'BankLineMatch');
});
