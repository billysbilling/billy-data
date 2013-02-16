# TODO

## Small fixes

- `BD.store.findByIdInclude` should be removed (and moved to Billy).
- Remove the dependency on underscore js.

## Tests

- Attributes
- Transforms
- belongsTo and belongsToReference
- HasMany
- Sideload, loadMany, load
- Namespaces
- Finding records
- Dirty
- Rollback
- Delete records
- Create records
- Save records
- Serialization
- Validation errors
- Parsing references

## Wish list

### Smarter filtered record arrays
- Let `BD.store.filter` return a `BD.FilteredRecordArray`, which is automatically updated when relevant records are changed.

The API could be `BD.store.filter(type, filter, filterObserveProperties, comparator, comparatorObserveProperties)`, where:

- `type` is a subclass of BD.Model.
- `filter` can be:
-- A hash with properties to match (e.g. `{name: 'John', isPublic: true}`
-- A function that takes a record and returns true if the record should be included in the array. 
- `filterObserveProperties` is a list of properties, that when a record belonging to `type` changes one of these properties it should be evaluated against the `filter`.
- `comparator` can be:
-- A string, which represents the property that records should be sorted by.
-- A hash with property names as key and sort order (`ASC` or `DESC`) as values. Example: `{name: 'ASC', birthday: 'DESC'}`
-- A function that takes two records and a comparison integer value.
 
The `BD.FilteredRecordArray` functionality could also replace the way we currently handle hasMany record arrays.
