//This is one measure
define([
  'jquery',
  'underscore',
  'backbone',
  'models/beat'
], function($, _, Backbone, beatModel){
  return Backbone.Collection.extend({
    model: beatModel,

    initialize: function(){

    }
  });

  //return new beatsCollection();
});
