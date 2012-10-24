// Filename: views/measures/measuresView
define([
  'jquery',
  'underscore',
  'backbone',
  // Pull in the Collection module from above
  'collections/beats',
  'collections/measures',
  'views/beats/beatsView',
  'text!templates/measures/measures.html',
  'app/dispatch',
], function($, _, Backbone, BeatsCollection, measuresCollection, BeatsView, measuresTemplate, dispatch){
  var beatsView = Backbone.View.extend({
    el: $('.component'),

    events : {
      'click .addMeasure' : 'add',
      'click .delete' : 'remove'
    },

    initialize: function(){
      this.measure = new BeatsCollection;

      for (var i = 0; i < 8; i++) {
        this.measure.add();
      }

      this.component = measuresCollection;
      this.component = measuresCollection.add({beats: this.measure});
    },

    render: function(){
      $(this.el).html('<div class="addMeasure">+</div>');

      _.each(this.component.models, function(measure) {
        var compiledTemplate = _.template( measuresTemplate, {measure: measure} );
        $(this.el).find('.addMeasure').before( compiledTemplate );

        new BeatsView({collection:measure.get('beats'), el:'#measure'+measure.cid});
      }, this);

     return this;
    },

    add: function(){
      console.log('add measure');
      this.measure = new BeatsCollection;

      for (var i = 0; i < 8; i++) {
        this.measure.add();
      }

      this.component = measuresCollection.add({beats: this.measure});
      this.render();
    },

    remove: function(ev){
      console.log('remove measure');

      var model = this.component.getByCid($(ev.target).parents('.measure').attr('id').replace('measure',''));
      this.component.remove(model);

      this.render();
    }
  });

  return new beatsView();
});
