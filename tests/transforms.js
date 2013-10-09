QUnit.module('Transforms');

test('String deserialization', function() {
    equal(BD.transforms.string.deserialize(null), null);
    equal(BD.transforms.string.deserialize(''), '');
    equal(BD.transforms.string.deserialize('Batman'), 'Batman');
    equal(BD.transforms.string.deserialize(123), '123');
    equal(BD.transforms.string.deserialize(123.456), '123.456');
});

test('String serialization', function() {
    equal(BD.transforms.string.serialize(null), null);
    equal(BD.transforms.string.serialize(''), '');
    equal(BD.transforms.string.serialize('Batman'), 'Batman');
    equal(BD.transforms.string.serialize(123), '123');
    equal(BD.transforms.string.serialize(123.456), '123.456');
});

test('Number deserialization', function() {
    equal(BD.transforms.number.deserialize(null), null);
    equal(BD.transforms.number.deserialize('0'), 0);
    equal(BD.transforms.number.deserialize(0), 0);
    equal(BD.transforms.number.deserialize('123'), 123);
    equal(BD.transforms.number.deserialize(123), 123);
    equal(BD.transforms.number.deserialize('123.456'), 123.456);
    equal(BD.transforms.number.deserialize(123.456), 123.456);
});

test('Number serialization', function() {
    equal(BD.transforms.number.serialize(null), null);
    equal(BD.transforms.number.serialize('0'), 0);
    equal(BD.transforms.number.serialize(0), 0);
    equal(BD.transforms.number.serialize('123'), 123);
    equal(BD.transforms.number.serialize(123), 123);
    equal(BD.transforms.number.serialize('123.456'), 123.456);
    equal(BD.transforms.number.serialize(123.456), 123.456);
});

test('Boolean deserialization', function() {
    equal(BD.transforms.boolean.deserialize(null), false);
    equal(BD.transforms.boolean.deserialize(true), true);
    equal(BD.transforms.boolean.deserialize(false), false);
    equal(BD.transforms.boolean.deserialize('true'), true);
    equal(BD.transforms.boolean.deserialize('tRUe'), true);
    equal(BD.transforms.boolean.deserialize('t'), true);
    equal(BD.transforms.boolean.deserialize('T'), true);
    equal(BD.transforms.boolean.deserialize('1'), true);
    equal(BD.transforms.boolean.deserialize(1), true);
    equal(BD.transforms.boolean.deserialize('false'), false);
    equal(BD.transforms.boolean.deserialize('faLSE'), false);
    equal(BD.transforms.boolean.deserialize('f'), false);
    equal(BD.transforms.boolean.deserialize('F'), false);
    equal(BD.transforms.boolean.deserialize('0'), false);
    equal(BD.transforms.boolean.deserialize(0), false);
});

test('Boolean serialization', function() {
    equal(BD.transforms.boolean.serialize(true), true);
    equal(BD.transforms.boolean.serialize(false), false);
});

test('Date deserialization', function() {
    equal(BD.transforms.date.deserialize(null), null);
    equal(BD.transforms.date.deserialize('2013-02-14').format('YYYY-MM-DD'), '2013-02-14');
    equal(BD.transforms.date.deserialize('2013-02-14T12:34:45').format('YYYY-MM-DD'), '2013-02-14');
});

test('Date serialization', function() {
    equal(BD.transforms.date.serialize(null), null);
    equal(BD.transforms.date.serialize(moment('2013-02-14')), '2013-02-14');
});

test('DateTime deserialization', function() {
    equal(BD.transforms.datetime.deserialize(null), null);
    equal(BD.transforms.datetime.deserialize('2013-02-14').format('YYYY-MM-DD HH:mm:ss'), '2013-02-14 00:00:00');
    equal(BD.transforms.datetime.deserialize('2013-02-14T12:34:45').format('YYYY-MM-DD HH:mm:ss'), '2013-02-14 12:34:45');
});

test('DateTime serialization', function() {
    equal(BD.transforms.datetime.serialize(null), null);
    equal(BD.transforms.datetime.serialize(moment('2013-02-14')), '2013-02-14T00:00:00');
    equal(BD.transforms.datetime.serialize(moment('2013-02-14T12:34:45')), '2013-02-14T12:34:45');
});