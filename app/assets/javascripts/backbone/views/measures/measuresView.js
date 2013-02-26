// Filename: views/measures/measuresView
define([
  'jquery',
  'underscore',
  'backbone',
  // Pull in the Collection module from above
  'backbone/collections/beats',
  'backbone/collections/measures',
  'backbone/views/beats/beatsView',
  'text!backbone/templates/measures/measures.html',
  'app/dispatch',
  'app/state',
  'app/log'
], function($, _, Backbone, BeatsCollection, MeasuresCollection, BeatsView, measuresTemplate, dispatch, state, log){
  return Backbone.View.extend({
    el: $('.component'),

    events : {
      'click .addMeasure' : 'add',
      'click .delete' : 'remove'
    },

    initialize: function(options){
      if (options) {
        this.component = options.collection;
        this.parent = options.parent;
        this.el = options.el;
      } else {
        this.measure = new BeatsCollection;

        for (var i = 0; i < 4; i++) {
          this.measure.add();
        }

        this.component = new MeasuresCollection;
        this.component.add({beats: this.measure});
      }
      this.render();
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
      if ($('#measure'+this.component.models[0].cid).parent().hasClass('selected')) {
        console.log('add measure');
        this.measure = new BeatsCollection;

        for (var i = 0; i < state.get('signature'); i++) {
          this.measure.add();
        }

        this.component.add({beats: this.measure});

        name = 'measure' + _.last(this.component.models).cid + '.';
        _.each(this.measure.models, function(beats) {
          name = name + 'beat'+ beats.cid + '.';
        }, this);

        log.sendLog([[3, "Added a measure: "+name]]);

        this.render();

        dispatch.trigger('stopRequest.event', 'off');
      }
    },

    remove: function(ev){
      if ($('#measure'+this.component.models[0].cid).parent().hasClass('selected')) {
        if(this.component.models.length == 1) {
          console.log('Can\'t remove the last measure!');
          return;
        }
        console.log('remove measure');

        var model = this.component.getByCid($(ev.target).parents('.measure').attr('id').replace('measure',''));
        this.component.remove(model);

        log.sendLog([[3, "Removed a measure: measure"+model.cid]]);

        this.render();

        dispatch.trigger('stopRequest.event', 'off');
      }
    }
  });
});