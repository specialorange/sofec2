//filename models/hTrack.js
/*
  This is the horizontal line track model.
  It represents one individual instrument (of a unique sound)
  They are 
*/
define([
  'underscore',
  'bbone',
  'backbone/collections/measures',
  'backbone/models/remainingInstrumentGenerator'
], function(_, Backbone, MeasuresCollection, RemainingInstrumentGenerator ) {
  var HTrackModel = Backbone.Model.extend({
    defaults: {
      label: 'noName',
      type: 'nn',
      img: 'ofAsnare',
      // mute: false, maybe not getting used?
      sample: 'shhh',
      gain: 1,
      measures: MeasuresCollection,
      active: true,
      signature: 0, //initially set to zero, but set in the init of StageView
      instrumentMenu: RemainingInstrumentGenerator,
      tempo: '' //bpm
    },
    initialize: function(options){
      console.log('initializing the hTrackModel with these options: ', options);
      // I need to listen to the measures collection's beats collection [length] on the measure model of the measure collection
      for (var i = 0; i < this.get('measures').models.length; i++) {
        this.listenTo(this.get('measures').models[i].get('beatsCollection'), 'add remove', this.updateModelSignature);  
      }
    },
    updateModelSignature: function(){
      // TODO Try and figure out a waty to listen to individual beats getting added or removed, but not the collection reset
      console.log('updating htrack signature to '+(this.get('measures').models[0].get('beatsCollection').length));
      var newSignature = this.get('measures').models[0].get('beatsCollection').length;
      this.set('signature', newSignature);
      // TODO SEND LOG what it was, what it is now
    }
  });
  return HTrackModel;
});