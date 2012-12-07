define([
  'jquery',
  'underscore',
  'backbone',
  'models/beat',
  'app/dispatch',
  'app/log'
], function($, _, Backbone, BeatModel, dispatch, log){
  return Backbone.View.extend({
    el: $('.beat'),

    events : {
      'click' : 'toggle'
    },

    initialize: function(options){
      if (options) {
        this.model = options.model;
        this.el = options.el;
      } else {
        this.model = new BeatModel;
      }

      this.render();
    },

    render: function(){
      if (this.model.get("selected"))
        $(this.el).html('<div class="ON"><div class="animated-beat"></div></div>');
      else
        $(this.el).html('<div class="OFF"><div class="animated-beat"></div></div>');

      return this;
    },

    toggle: function(){
      var bool = this.model.get("selected");
      this.model.set("selected", !bool);

      this.render()

      console.log("beat toggled!");
      log.sendLog([[1, "beat" + this.model.cid + " toggled: "+!bool]]);

      dispatch.trigger('beatClicked.event');
    }
  });
});