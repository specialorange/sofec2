// Filename: views/components/componentsView.js
/*
  This is the componentsView.
  This is the view that represents the entire drum kit.

  This is where the audio is initialized and played.
*/
define([
  'jquery',
  'underscore',
  'backbone',
  // Pull in the Collection module from above
  'backbone/collections/beats',
  'backbone/collections/measures',
  'backbone/collections/representations',
  'backbone/collections/components',
  'backbone/models/beat',
  'backbone/models/measure',
  'backbone/models/component',
  'backbone/models/representation',
  'backbone/models/remainingInstrumentGenerator',
  'backbone/views/button/remainingInstrumentGeneratorView',
  'backbone/views/component/componentView',
  'text!backbone/templates/component/component.html',
  'app/dispatch',
  'backbone/models/state'
], function($, _, Backbone, BeatsCollection, MeasuresCollection, RepresentationsCollection, ComponentsCollection, BeatModel, MeasureModel, ComponentModel, RepresentationModel, RemainingInstrumentGeneratorModel, RemainingInstrumentGeneratorView, ComponentView, ComponentTemplate, dispatch, state){
  var ComponentsView = Backbone.View.extend({
    el: $('#sof-composition-area'),

    initialize: function(){
      // Default Measure representation state - also set "active" class in fractionRepresentation.html AND wholeMeasureRepresentation.html
      this.defaultMeasureRepresentation = 'audio';
      this.defaultFractionRepresentation = 'fraction';

      //this context variable gives us access to all of the
      //web audio api methods/objects.
      this.context = new webkitAudioContext();
      this.bufferList = new Array();

      // set the songs unused instruments
      this.unusedInstrumentsModel = RemainingInstrumentGeneratorModel;

      //this gainNode controls the volume of the entire audio output.
      //we use it to toggle play/stop.
      this.masterGainNode = this.context.createGainNode();

      this.drumkit = ComponentsCollection;

      //this is creating the snare component.

      // this creates 1 measure, and addes beats and the representations to itself
      this.manuallyCreatedMeasureBeatsCollection = new BeatsCollection;
      //for each beat - also change signature below
      for (var i = 0; i < 6; i++) {
        this.manuallyCreatedMeasureBeatsCollection.add();
      }
      // add an audio rep
      this.manuallyCreatedRepresentationModel = new RepresentationModel;
      this.manuallyCreatedRepresentationModel.representationType = 'audio';
      this.manuallyCreatedMeasureRepresentationCollection = new RepresentationsCollection;
      this.manuallyCreatedMeasureRepresentationCollection.add(this.manuallyCreatedRepresentationModel);

      this.manuallyCreatedMeasuresCollection = new MeasuresCollection;
      this.manuallyCreatedMeasuresCollection.add({
        beats: this.manuallyCreatedMeasureBeatsCollection, measureRepresentations: this.manuallyCreatedMeasureRepresentationCollection});

      this.drumkit = ComponentsCollection.add({
        label: 'Snare',
        type: 'sn',
        img: 'snare.png',
        mute: false,
        sample: '808_sn.m4a',
        measures: this.manuallyCreatedMeasuresCollection,
        signature: this.manuallyCreatedMeasuresCollection.models[0].get('beats').length,
        active: true
      });

      // //this is creating the hi-hat component.
      // this.manuallyCreatedMeasure = new BeatsCollection;

      // //for each beat - also change signature below
      // for (var i = 0; i < 5; i++) {
      //   this.manuallyCreatedMeasure.add();
      // }

      // this.manuallyCreatedMeasuresCollection = new MeasuresCollection;
      // this.manuallyCreatedMeasuresCollection.add({beats: this.manuallyCreatedMeasure});

      // this.drumkit = ComponentsCollection.add({
      //   label: 'Hi Hat',
      //   img: 'hihat.png',
      //   mute: true,
      //   sample: '808_hh.m4a',
      //   measures: this.manuallyCreatedMeasuresCollection,
      //   signature: 5,
      //   active: true
      // });

      // //this is creating the kick drum component.
      // this.manuallyCreatedMeasure = new BeatsCollection;

      // //for each beat - also change signature below
      // for (var i = 0; i < 4; i++) {
      //   this.manuallyCreatedMeasure.add();
      // }

      // this.manuallyCreatedMeasuresCollection = new MeasuresCollection;
      // this.manuallyCreatedMeasuresCollection.add({beats: this.manuallyCreatedMeasure});

      // this.drumkit = ComponentsCollection.add({
      //   label: 'Kick Drum',
      //   img: 'kick.png',
      //   mute: true,
      //   sample: '808_kd.m4a',
      //   measures: this.manuallyCreatedMeasuresCollection,
      //   signature: 4,
      //   active: true
      // });


      // //this is creating the synth component.
      // this.manuallyCreatedMeasure = new BeatsCollection;

      // //for each beat - also change signature below
      // for (var i = 0; i < 3; i++) {
      //   this.manuallyCreatedMeasure.add();
      // }

      // this.manuallyCreatedMeasuresCollection = new MeasuresCollection;
      // this.manuallyCreatedMeasuresCollection.add({beats: this.manuallyCreatedMeasure});

      // this.drumkit = ComponentsCollection.add({
      //   label: 'Synth',
      //   img: 'synth.png',
      //   mute: true,
      //   sample: 'sy.mp3',
      //   measures: this.manuallyCreatedMeasuresCollection,
      //   signature: 3,
      //   active: true
      // });

      //creating two arrays to hold our gain nodes.
      //the first is for sustained-note sounds,
      //the second is for the muting of individual components.
      this.gainNodeList = new Array();
      this.muteGainNodeList = new Array();

      //use our webaudio context to creat two gain nodes
      //for each component.
      for (var i = 0; i < this.drumkit.models.length; i++) {
        this.gainNodeList[i] = this.context.createGainNode();
        this.muteGainNodeList[i] = this.context.createGainNode();
      };

      this.intervalID = null; //time is a function of measures and tempo (4 * 60/tempo * measures)

      //register the handler for togglePlay events.
      dispatch.on('togglePlay.event', this.togglePlay, this);
      dispatch.on('tempoChange.event', this.updateTempo, this);

      dispatch.on('instrumentAddedToCompositionArea.event', this.addInstrument, this);
      dispatch.on('instrumentDeletedFromCompositionArea.event', this.deleteInstrument, this);

      state.set('components', this.drumkit);
    },

    build: function(song) {
      console.log('starting building...');
      console.log('song');
      console.warn(song);
      song.set('content', JSON.parse(song.get('content')));
      this.drumkit.reset();
      // console.log('song.get('content').components');
      var components = song.get('content').components;
      console.log('var components');
      console.warn(components);
      for(var i = 0; i < components.length; i++) {
        var component = new ComponentModel();
        component.set('label', components[i].label);
        component.set('type', components[i].type);
        component.set('img', components[i].img);
        component.set('mute', components[i].mute);
        component.set('sample', components[i].sample);
        component.set('active', components[i].active);
        component.set('signature', components[i].signature);
        component.set('representation', components[i].representation);
        var mC = new MeasuresCollection();
        for(var j = 0; j < components[i].measures.length; j++) {
          var measureObj = components[i].measures[j];
          var measure = new MeasureModel();
          measure.set('label', measureObj.label);
          measure.set('numberOfBeats', measureObj.numberOfBeats);
          measure.set('divisions', measureObj.divisions);
          var bC = new BeatsCollection();
          for(var k = 0; k < measureObj.beats.length; k++) {
            var beatObj = measureObj.beats[k];
            var beat = new BeatModel();
            beat.set('selected', beatObj.selected);
            bC.add(beat);
          }
          measure.set('beats', bC);
          mC.add(measure);
        }
        component.set('measures', mC);
        console.log(component);
        this.drumkit.add(component);
      }
      this.render();
      console.log('done building');
      return this.drumkit;
    },

    render: function(){
      console.log('render: componentsView.js');
      $(this.el).html('');

      var counter = 0;

      //we have to render each one of our components.
      _.each(this.drumkit.models, function(component) {
        //loading the audio files into the bufferList.
        this.loadAudio(this.context, component.get('sample'), this.bufferList, counter );

        //compiling our template.
        var compiledTemplate = _.template( ComponentTemplate, {component: component, type: component.get('type')} );
        $(this.el).append( compiledTemplate );

        //create a component view.
        var componentView = new ComponentView({
          hTrack: component,
          el: '#component-container'+component.cid, 
          gainNode: this.muteGainNodeList[counter],
          defaultMeasureRepresentation: this.defaultMeasureRepresentation,
          // defaultFractionRepresentation: this.defaultFractionRepresentation,
          unusedInstrumentsModel: this.unusedInstrumentsModel
        });
        if(!component.get('active')) {
          console.log('found a muted one');
          componentView.toggleMute();
        }
        counter++;
      }, this);

      // Render the RemainingInstrumentGeneratorView
      var instrumentSelectorView = RemainingInstrumentGeneratorView;

      return this;
    },

    /*
      This function generates a 2d array
      of time durations that determine when the playback
      of each beat on each component should occur.
    */
    playLoop: function(){
      var tempo = state.get('tempo');
      var numBeats = 0;
      var i = 0;

      var deadSpace = 0;

      //create an array to hold arrays of durations.
      var componentDurations = new Array();

      //looping over each component in the drumkit.
      _.each(this.drumkit.models, function(component) {

        //create a duration array for this component.
        componentDurations[i] = new Array();

        _.each(component.get('measures').models, function(measure) {
          numBeats = measure.get('beats').length;
          //determining the duration for each beat.
          var beatDuration = 60 / tempo * state.get('signature') / (numBeats);
          _.each(measure.get('beats').models, function(beat) {

            /* if we need to trigger a sound at this beat
              we push a duration onto the duration array.
              if not, increment our deadSpace variable,
              by the beat duration,
              which will make subsequent durations longer.
            */
            if (beat.get('selected')) {
              //deadspace is a beat that is not getting played
              componentDurations[i].push(deadSpace);
              deadSpace = deadSpace + beatDuration;

            } else {
              deadSpace = deadSpace + beatDuration;
            }

          }, this);
        }, this);
        i++;
        // Reset the deadspace for the next component
        deadSpace = 0;
      }, this);
      console.log(componentDurations);
      //Lastly, we call playSound() with our completed
      //componentDurations 2d array.
      this.playSound(componentDurations);
    },

    /*
      This triggers the playback of sounds at the appropriate
      intervals for each component.
    */
    playSound: function(durations){
      console.log('Playing sound!');
      var componentToPlayIterator = 0;
      var startTime = this.context.currentTime; //this is important (check docs for explanation)
      _.each(durations, function(duration) { // component array
        _.each(duration, function(time) { // beats or deadspace start times
          //we call play on each component, passing in a lot of information.
          //this is called for each 'duration' in the duration array,
          //which is every activated beat and its associated duration between
          //it and the next activated beat.
          play(
            this,
            this.context,
            this.drumkit.at(componentToPlayIterator),
            this.bufferList[componentToPlayIterator],
            startTime+time, //startTime is the current time you request to play + the beat start time
            this.masterGainNode,
            this.gainNodeList[componentToPlayIterator],
            this.muteGainNodeList[componentToPlayIterator]);
        }, this);
        componentToPlayIterator++;
      }, this);

      /*
        This is where all the magic happens for the audio.

        Parameters are:
          self -> a reference to this componentsView instance.
          context -> a reference to the webaudio context.
          buffer -> the buffer that has been loaded with the appropriate audio file.
          time -> the duration that this playback is to last.
          gainNode -> this is the masterGainNode of this componentsView
          specGainNode -> this gain node controls envelope generation for sustained instruments.
          muteGainNoe -> this gain node controls the muting of components.
      */
      function play(self, context, component, buffer, time, gainNode, specGainNode, muteGainNode) {

        //a buffer source is what can actually generate audio.
        source = context.createBufferSource();
        source.buffer = buffer;

        /* here we make a series of connections to set up the signal flow
           of the audio through each of the three gain nodes.
           the final result looks like:

           source->specGainNode->muteGainNode->masterGainNode->your ears

        */
        source.connect(specGainNode);
        specGainNode.connect(muteGainNode);
        muteGainNode.connect(gainNode);
        gainNode.connect(context.destination);
        specGainNode.gain.value = 1;

        //calulating the duration of one beat.
        var duration =  (60 / state.get('tempo'));

        //note on causes the playback to start.
        source.noteOn(time, 0, duration);
        console.error(time);
        //these calls are used to generate an envelope that
        //makes sustained instruments play for only the duration of one beat.
        //this reduces pops and clicks from the signal being abruptly
        //stopped and started.
        specGainNode.gain.linearRampToValueAtTime(0, time);
        specGainNode.gain.linearRampToValueAtTime(1, time + 0.005);
        specGainNode.gain.linearRampToValueAtTime(1, time + (duration - 0.005));
        specGainNode.gain.linearRampToValueAtTime(0, time + duration);

        //we call noteOff to stop the sound after the duration of one beat.
        source.noteOff(time + duration);
      }

    },

    /*
      This function loads the audio files for each component
      and loads them into the buffer list.
    */
    loadAudio: function(context, url, bufferList, index){
      console.log("Loading...", url);
      // Load buffer asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", App.assets.path(url), true);
      request.responseType = "arraybuffer";

      request.onload = function() {
        // Asynchronously decode the audio file data in request.response
        context.decodeAudioData(
          request.response,
          function(buffer) {
            if (!buffer) {
              alert('error decoding file data: ' + url);
              return;
            }
            //place the decoded buffer into the bufferList
            bufferList[index] = buffer;
          },
          function(error) {
            console.error('decodeAudioData error', error);
          }
        );
      }

      request.onerror = function() {
        alert('BufferLoader: XHR error');
      }

      request.send();
    },


    /*
      This is triggered by togglePlay events.
    */
    togglePlay: function(val){

      //first we determine the number of the measures in
      //the component with the most measures.
      var maxMeasures = 0;
      _.each(this.drumkit.models, function(component) {
        if(maxMeasures < component.get('measures').length) {
          maxMeasures = component.get('measures').length;
        }
      }, this);

      //we use the maximum number of measures, and the global tempo
      //to determine the duration (in ms) of one loop of the sequencer.
      var duration = state.get('signature') * 60 / state.get('tempo') * maxMeasures * 1000;
      console.warn(duration);
      if (this.intervalID) {
        //if we are already playing, we stop and trigger the
        //animation to stop.
        console.log('togglePlay: off');
        dispatch.trigger('toggleAnimation.event', 'off');

        clearInterval(this.intervalID);
        this.intervalID = null;
        //we set the masterGainNode to zero, which mutes all output.
        this.masterGainNode.gain.value = 0;
      } else {

        //if we are not playing, we start the playback of audio
        //and trigger an event to start the animation.
        console.log('togglePlay: on');

        //we call playLoop() with our calculated duration to initialize
        //and play the audio.
        //this.playLoop();
        this.intervalID = setInterval((function(self) {
        return function() {
          self.playLoop(); 
        } } )(this),
        duration);
        //we set the masterGainNode to 1, turning on master output.
        this.masterGainNode.gain.value = 1;

        dispatch.trigger('toggleAnimation.event', 'on', duration, state.get('signature'), maxMeasures);

      }
    },

    updateTempo: function(val) {
      console.log('tempo changed to ' + val);
      this.drumkit.tempo = val;
    },

    addInstrument: function(instrument) {
      //this is creating the new instrument htrack.

      // this creates 1 measure, and addes beats and the representations to itself
      this.manuallyCreatedMeasureBeatsCollection = new BeatsCollection;
      //for each beat - also change signature below
      for (var i = 0; i < 6; i++) {
        this.manuallyCreatedMeasureBeatsCollection.add();
      }

      // add an instrument rep
      this.manuallyCreatedRepresentationModel = new RepresentationModel;
      this.manuallyCreatedRepresentationModel.representationType = 'audio';
      this.manuallyCreatedMeasureRepresentationCollection = new RepresentationsCollection;
      this.manuallyCreatedMeasureRepresentationCollection.add(this.manuallyCreatedRepresentationModel);

      // Make a htrack
      this.manuallyCreatedMeasuresCollection = new MeasuresCollection;
      this.manuallyCreatedMeasuresCollection.add({
        beats: this.manuallyCreatedMeasureBeatsCollection, measureRepresentations: this.manuallyCreatedMeasureRepresentationCollection});

      this.drumkit = ComponentsCollection.add({
        label: this.unusedInstrumentsModel.getDefault(instrument, 'label'),
        type: this.unusedInstrumentsModel.getDefault(instrument, 'type'),
        img: this.unusedInstrumentsModel.getDefault(instrument, 'image'),
        mute: false,
        sample: this.unusedInstrumentsModel.getDefault(instrument, 'sample'),
        measures: this.manuallyCreatedMeasuresCollection,
        signature: this.manuallyCreatedMeasuresCollection.models[0].get('beats').length,
        active: true
      });

      // Add the gain nodes for the music for the new instrument
      this.gainNodeList[this.drumkit.models.length-1] = this.context.createGainNode();
      this.muteGainNodeList[this.drumkit.models.length-1] = this.context.createGainNode();

      this.render();
    },

    deleteInstrument: function(instrument) {
      console.warn('in componentsView deleteInstrument');
      console.log('deleting : ' + instrument.instrument);
      console.log('deleting : ' + instrument.model);
      dispatch.trigger('removeInstrumentToGeneratorModel.event', instrument.instrument);
      console.warn(this.drumkit);
      this.drumkit.remove(instrument.model);
      console.warn(this.drumkit);

      this.render();
    }
  });
  return new ComponentsView();
});
