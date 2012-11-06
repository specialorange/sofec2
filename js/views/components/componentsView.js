// Filename: views/beatBars/beatBarsView
define([
  'jquery',
  'underscore',
  'backbone',
  // Pull in the Collection module from above
  'collections/beats',
  'collections/measures',
  'collections/components',
  'views/measures/measuresView',
  'text!templates/components/components.html',
  'app/dispatch',
  'app/state'
], function($, _, Backbone, BeatsCollection, MeasuresCollection, componentsCollection, MeasuresView, componentsTemplate, dispatch, state){
  var componentsView = Backbone.View.extend({
    el: $('#drum-kit'),

    events : {
      'click img' : 'togglePlay'
    },

    initialize: function(){
      this.context = new webkitAudioContext();
      this.bufferList = new Array();
      this.masterGainNode = this.context.createGainNode();

      ///////Create Gain Nodes      /////////////
      this.snareGainNode = this.context.createGainNode();
      this.snareGainNode.gain.value = 1;
      this.hihatGainNode = this.context.createGainNode();
      this.hihatGainNode.gain.value = 0.5;
      this.kickGainNode = this.context.createGainNode();
      //////////////////////////////////////////

      this.measure = new BeatsCollection;

      for (var i = 0; i < 4; i++) {
        this.measure.add();
      }

      this.component = new MeasuresCollection;
      this.component.add({beats: this.measure});

      this.drumkit = componentsCollection;

      this.drumkit = componentsCollection.add({
        label: 'snare',
        img: 'img/snare.png',
        mute: false,
        sample: 'samples/808_sd.ogg',
        measures: this.component,
        active: true
      });

      this.measure = new BeatsCollection;

      for (var i = 0; i < 4; i++) {
        this.measure.add();
      } 

      this.component = new MeasuresCollection;
      this.component.add({beats: this.measure});

      this.drumkit = componentsCollection.add({
        label: 'highHat',
        img: 'img/hihat.png',
        mute: true,
        sample: 'samples/808_chh.ogg',
        measures: this.component,
        active: true
      });

      this.measure = new BeatsCollection;

      for (var i = 0; i < 4; i++) {
        this.measure.add();
      }

      this.component = new MeasuresCollection;
      this.component.add({beats: this.measure});

      this.drumkit = componentsCollection.add({
        label: 'kickDrum',
        img: 'img/kick.png',
        mute: true,
        sample: 'samples/808_bd.ogg',
        measures: this.component,
        active: false
      });
      
      //dispatch.on('signatureChange.event', this.reconfigure, this);

      this.intervalID = null; //time is a function of measures and tempo (4 * 60/tempo * measures)

      dispatch.on('beatClicked.event', this.recalculateFraction, this)
      dispatch.on('signatureChange.event', this.recalculateFraction, this)
    },

    render: function(){
      $(this.el).html('');

      var counter = 0;
      _.each(this.drumkit.models, function(component) {
        this.loadAudio(this.context, component.get('sample'), this.bufferList, counter );
        var compiledTemplate = _.template( componentsTemplate, {component: component} );
        $(this.el).append( compiledTemplate );

        new MeasuresView({collection:component.get('measures'), el:'#component'+component.cid});
        counter++;
      }, this);

      this.recalculateFraction();

      return this;
    },


    playLoop: function(){
      var tempo = state.get('tempo');
      console.log(tempo);
      var numBeats = 0;
      var i = 0;

      var deadSpace = 0;

      var componentDurations = new Array();
      _.each(this.drumkit.models, function(component) {
        componentDurations[i] = new Array();

        _.each(component.get('measures').models, function(measure) {
          numBeats = measure.get('beats').length;
          var beatDuration = 60 / tempo * 4 / numBeats;
          _.each(measure.get('beats').models, function(beat) {
            // console.log(beatDuration);

            if (beat.get('selected')) {
              componentDurations[i].push(deadSpace);
              deadSpace = deadSpace + beatDuration;
              //console.log(deadSpace);
            } else {
              deadSpace = deadSpace + beatDuration;
            }

          }, this);
        }, this);
        i++;
        deadSpace = 0;
      }, this);

      this.playSound(componentDurations);
    },

    playSound: function(durations){
      //console.log('play sound', durations);
      var componentToPlay = 0;
      var startTime = this.context.currentTime; //this is important (check docs for explination)

      _.each(durations, function(duration) {
        _.each(duration, function(time) {
          if(componentToPlay == 0) {
            play(this.context, this.bufferList[componentToPlay], startTime+time, this.masterGainNode, this.snareGainNode);
          }
          else if(componentToPlay == 1) {
            play(this.context, this.bufferList[componentToPlay], startTime+time, this.masterGainNode, this.hihatGainNode);            
          }
          else if(componentToPlay == 2) {
            play(this.context, this.bufferList[componentToPlay], startTime+time, this.masterGainNode, this.kickGainNode);                        
          }
        }, this);
        componentToPlay++;
      }, this);

      function play(context, buffer, time, gainNode, specGainNode) {
        //console.log(startTime);
        //console.log(this.audioSources);
        var source = context.createBufferSource();
        source.buffer = buffer;
        //source.connect(context.destination);
        source.connect(specGainNode);
        specGainNode.connect(gainNode);
        gainNode.connect(context.destination);
        source.noteOn(time);
      }

    },

    loadAudio: function(context, url, bufferList, index){
      console.log("Loading...", url);
      // Load buffer asynchronously
      var request = new XMLHttpRequest();
      request.open("GET", url, true);
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

    recalculateFraction: function(val){
      var numerator = 0;
      var denominator = 0;

      _.each(this.drumkit.models, function(component) {
        _.each(component.get('measures').models, function(measure) {
          _.each(measure.get('beats').models, function(beat) {
            if(beat.get('selected')) {
              if (val) {
                numerator = 0;
              } else {
                numerator++;  
              }
            }
          }, this);

          if (val) {
            denominator = val;
          } else {
            denominator = measure.get('beats').models.length;
          }
        }, this);

        $('#component'+component.cid).next().find('.numerator').text(numerator);
        $('#component'+component.cid).next().find('.denominator').text(denominator);

        numerator = 0;
      }, this);
    },

    togglePlay: function(){
      var maxMeasures = 0;
      _.each(this.drumkit.models, function(component) {
        console.log('maxMeasures = ' , component.get('measures').length);
        if(maxMeasures < component.get('measures').length) {
          maxMeasures = component.get('measures').length;
        }
      }, this);

      var duration = 4 * 60 / state.get('tempo') * maxMeasures * 1000;
      console.log(duration);
      if (this.intervalID) {
        clearInterval(this.intervalID);
        this.intervalID = null;
        this.masterGainNode.gain.value = 0;
      } else {
        this.intervalID = setInterval((function(self) {
        return function() {self.playLoop(); } } )(this),
        duration);
        this.masterGainNode.gain.value = 1;
      }
    }
  });
  return new componentsView();
});
