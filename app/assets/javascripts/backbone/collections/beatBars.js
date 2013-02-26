define([
  'jquery',
  'underscore',
  'backbone',
  'backbone/models/beatBar'
], function($, _, Backbone, beatBarModel){
  var beatBarsCollection = Backbone.Collection.extend({
    model: beatBarModel,

    initialize: function(){

    }
  });

  return new beatBarsCollection();
});