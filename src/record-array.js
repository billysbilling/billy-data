BD.RecordArray = Em.ArrayProxy.extend(Em.Evented, {

    isLoaded: false,
    content: null,

    parent: null,
    hasManyKey: null,

    arrayContentDidChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var parent = this.get('parent'),
            hasManyIds,
            data,
            hasManyKey,
            spliceArgs,
            i;
        if (!parent) {
            return;
        }
        data = parent.get('data');
        hasManyKey = this.get('hasManyKey');
        hasManyIds = data.hasMany[hasManyKey];
        if (!hasManyIds) {
            hasManyIds = data.hasMany[hasManyKey] = [];
        }
        if (removed) {
            hasManyIds.splice(index, removed);
        }
        if (added) {
            spliceArgs = [index, 0];
            for (i = 0; i < added; i++) {
                spliceArgs.push(this.objectAt(index+i).clientIdObj);
            }
            hasManyIds.splice.apply(hasManyIds, spliceArgs);
        }
        return ret;
    }

    //Currently not used
//    updateIds: function(ids) {
//        return;
//        var type = this.get('type');
//        for (var i = 0; i < ids.length; i++) {
//            var id = ids[index];
//            var r = this.objectAt(i);
//            if (!r || id != r.get('id')) {
//                if (r) {
//                    this.removeAt(i);
//                }
//                this.insertAt(i, BD.store.find(type, id));
//            }
//        }
//        var rest = this.get('length') - ids.length;
//        if (rest > 0) {
//            this.removeAt(ids.length, rest);
//        }
//    }

});