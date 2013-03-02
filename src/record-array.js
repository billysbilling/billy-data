BD.RecordArray = Em.ArrayProxy.extend(Em.Evented, {

    isLoaded: false,
    content: null,

    parent: null,
    hasManyKey: null,

    init: function() {
        this._super();
        this.forEach(function(r) {
            r.inRecordArrays[Em.guidFor(this)] = this;
        }, this);
    },
    
    arrayContentWillChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var r,
            i;
        if (removed) {
            for (i = 0; i < removed; i++) {
                r = this.objectAt(index + i);
                delete r.inRecordArrays[Em.guidFor(this)];
            }
        }
        return ret;
    },
    arrayContentDidChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var parent = this.get('parent'),
            hasManyIds,
            data,
            hasManyKey,
            spliceArgs,
            r,
            i;
        if (added) {
            for (i = 0; i < added; i++) {
                r = this.objectAt(index + i);
                r.inRecordArrays[Em.guidFor(this)] = this;
            }
        }
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
    },
    
    willDestroy: function() {
        this.forEach(function(r) {
            delete r.inRecordArrays[Em.guidFor(this)];
        }, this);
        this._super();
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