//filename: collections/labels.js
/*
  This is the labels collection.
*/
define([
  'jquery',
  'underscore',
  'backbone',
  'backbone/models/label'
], function($, _, Backbone, LabelModel){
  var LabelCollection = Backbone.Collection.extend({
    model: LabelModel,
    initialize: function(){
    }
  });

  return new LabelCollection();
});