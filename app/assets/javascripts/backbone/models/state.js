//filename: backbone/models/state.js
/*
  This maintains two pieces of information that are
  global to the song.
  namely, the time signature (# of beats per measure)
  and the tempo in beats per minute.
*/

define([
  'underscore',
  'backbone',
  'app/dispatch',
  'backbone/models/transport'
], function(_, Backbone, dispatch, transport) {
  var state = Backbone.Model.extend({
    defaults: {
      signature: 4,
      tempo: 120,
      baseTempo: 120,
      components: null,
      micLevel: .8
    },

    initialize: function() {
      this.signature = 0;
      this.countIn = 1;
      this.globalDate = new Date();
      this.previousTime = 0;
      this.timeIntervals = [0];
      this.isTapping = false;
      this.isRecording = false;
      this.beatArray = new Array();
      this.waitCount = 0;
      this.isWaiting = true;
      this.transport = transport;
      this.finalMeasureBeatTimeIntervals50 = [];
      this.finalMeasureBeatTimeIntervals100 = [];
      this.finalMeasureBeatTimeIntervals150 = [];
      this.finalMeasureBeatTimeIntervals200 = [];
      this.finalMeasureBeatTimeIntervals250 = [];
      if(window.gon) {
        this.micLevel = gon.micLevel;
        console.warn('Mic Level = ' + this.micLevel);
      }

      this.context = new window.webkitAudioContext();

      dispatch.on('doall.event', this.recordTempoAndPattern, this);

      dispatch.on('recordClicked.event', this.recordButtonClicked, this);
      dispatch.on('tappingTempo.event', this.tapTempoClicked, this);
      dispatch.on('stopRecording.event', this.stopRecording, this);
      dispatch.on('tempoDetected.event', this.stopRecording, this);
    },

    recordTempoAndPattern: function() {
      console.log('recordTempoAndPattern function in state');
      if(this.transport.isPlaying) {
        dispatch.trigger('togglePlay.event');
      }
      this.isTapping = true;
      if(window.tapIntervalID) {
        window.clearInterval(tapIntervalID);
      }
      for(var i = 0; i < window.signature; i++) {
        window.beatArray[i] = 0;
      }
      this.isWaiting = true;
      this.signature = 0;

      if (this.hasGetUserMedia()) {
        console.log("we do have user media access.");
        var ƒthis = this;
        navigator.webkitGetUserMedia({audio: true}, function(stream) {
          var microphone = ƒthis.context.createMediaStreamSource(stream);
          ƒthis.microphone = microphone;
          ƒthis.micGain = ƒthis.context.createGainNode();
          ƒthis.micGain.gain = ƒthis.micLevel;
          ƒthis.jsNode = ƒthis.context.createScriptProcessor(512, 2, 2);
          ƒthis.microphone.connect(ƒthis.micGain);
          ƒthis.microphone.connect(ƒthis.context.destination);   
          ƒthis.micGain.connect(ƒthis.jsNode);
          ƒthis.jsNode.connect(ƒthis.context.destination);
          ƒthis.prevTime = new Date().getTime();
          ƒthis.jsNode.onaudioprocess = (function() {
            return function(e) {
              ƒthis.analyze(e);
            };
          }());
          ƒthis.waveform = new Float32Array(ƒthis.jsNode.bufferSize);   
        }, this.onFailSoHard);
      } 
      else {
        alert('getUserMedia() is not supported in your browser');
      }
    },

    processWaveform: function(time, waveform) {
      this.totals = 0;
      // Waveform.length = 512  ¿ I think this means we listen to 512 partitions per second?
      for(var i = 0; i < waveform.length; i++) {
        this.totals += waveform[i] * waveform[i];
      }
      this.totals = this.totals / waveform.length;
      var RMS = Math.sqrt(this.totals);
      console.warn(this.prevTime);
      // console.warn('Time: ' + time + ' RMS: ' + RMS);

      // elapsed time since last beat analysis in ms
      var elapsedTime = time - this.prevTime;

      // If we are still tapping, and are still recording (isWaiting = true), and the RMS is greater than .05
      if(RMS > 0.05 && (elapsedTime > 200) && this.isTapping && this.isWaiting) {
        console.log('RMS = ' + RMS);
        console.log('elapsed time: ' + elapsedTime);
        this.prevTime = time;
        //On the first beat
        if(this.countIn == 1) {
          var newCurrentTime = new Date().getTime();
          this.startTime = newCurrentTime;
          console.log('Start time: ' + this.startTime);
          this.previousTime = newCurrentTime;
          console.warn(this.beatTimings);
          this.countIn++;
          this.signature++;
          console.log('Beats in Measure = ' + this.signature);
          console.log('average in ms: ' + 'CAN\'T MEASSURE WITH ONE BEAT' + ' || average in BPM: ' + 'CAN\'T MEASSURE WITH ONE BEAT');
        }
        // As long as we are still tapping, but not on the first beat
        else if(this.isWaiting) {
          // Beat Count
          this.signature++;
          //Reset the wait counter since a beat was detected
          this.waitCount = 0;
          console.log('Beats in Measure = ' + this.signature);

          // BPM in ms and min
          var currentTime = new Date().getTime();
          this.timeIntervals.push(currentTime - this.previousTime);
          this.previousTime = currentTime;
          this.lastTimeDelta = currentTime - this.previousTime;
          var songTotalTimeDuration = 0;
          for(var i = 0; i < this.timeIntervals.length; i++) {
            songTotalTimeDuration += this.timeIntervals[i];
          }
          this.average = songTotalTimeDuration / this.timeIntervals.length;
          console.log('average in ms: ' + this.average + ' || average in BPM: ' + 60*1000/this.average);

          // Waiting for the listener to stop tapping
          if(window.waitIntervalID) {
            window.clearInterval(window.waitIntervalID);
            this.waitCount = 0;
          }
          var ƒthis = this;
          window.waitIntervalID = window.setInterval(function() {
            // If the user stops beating for *n* times, we stop listening to the tapping automatically
            // *n* is represented by ƒthis.waitCount
            console.warn('waitCount: ' + ƒthis.waitCount);
            if(ƒthis.waitCount == 2) {
              ƒthis.isWaiting = false;
              ƒthis.waitCount = 0;

              ƒthis.mainCounter = 0;
              ƒthis.isRecording = true;
              for(var i = 0; i < ƒthis.signature; i++) {
                ƒthis.finalMeasureBeatTimeIntervals50.push(ƒthis.roundTo50(ƒthis.timeIntervals[i]));
                ƒthis.finalMeasureBeatTimeIntervals100.push(ƒthis.roundTo100(ƒthis.timeIntervals[i]));
                ƒthis.finalMeasureBeatTimeIntervals150.push(ƒthis.roundTo150(ƒthis.timeIntervals[i]));
                ƒthis.finalMeasureBeatTimeIntervals200.push(ƒthis.roundTo200(ƒthis.timeIntervals[i]));
                ƒthis.finalMeasureBeatTimeIntervals250.push(ƒthis.roundTo250(ƒthis.timeIntervals[i]));
                ƒthis.beatArray[i] = 0;
              }
              // ƒthis.finalMeasureBeatTimeIntervals[ƒthis.finalMeasureBeatTimeIntervals.length-1] = ƒthis.roundTo100(ƒthis.lastTimeDelta);
              console.warn(ƒthis.finalMeasureBeatTimeIntervals50);
              console.warn(ƒthis.finalMeasureBeatTimeIntervals100);
              console.warn(ƒthis.finalMeasureBeatTimeIntervals150);
              console.warn(ƒthis.finalMeasureBeatTimeIntervals200);
              console.warn(ƒthis.finalMeasureBeatTimeIntervals250);
              dispatch.trigger('signatureChange.event', ƒthis.signature);

              ƒthis.isTapping = false;
              ƒthis.countIn = 1;
              //show the BPM
              var bpm = 1000 / ƒthis.average * 60;
              ƒthis.set('baseTempo', bpm);
              ƒthis.set('tempo', bpm);
              ƒthis.set('signature', ƒthis.signature);
              $('#tap-tempo').click();
              $('#tempo-slider-input').val(1);
              dispatch.trigger('tempoChange.event', bpm);
              dispatch.trigger('stopRecording.event');
              window.clearInterval(waitIntervalID);
            }
            ƒthis.waitCount++;
          }, this.average);
          this.countIn++;
        }
        console.warn(this.timeIntervals);
      }
      else if(RMS > 0.05 && this.isRecording) {
        _.each(this.get('components').models, function(component) {
          if($('#component'+component.cid).hasClass('selected')) {
            console.log(component.get('currentBeat'));
            var measuresCollection = component.get('measures');
            _.each(measuresCollection.models, function(measure) {
              var beatsCollection = measure.get('beats');
              var beat = beatsCollection.at(component.get('currentBeat'));
              console.log(beat);
              if(!beat.get('selected')) {
                $('#beat'+beat.cid).click();
              }
              console.log($('#beat'+beat.cid));
            }, this);
          }
        }, this);
      }
    },

    tapTempoClicked: function() {
      console.log('Tap Tempo Clicked');
      if(this.transport.isPlaying) {
        dispatch.trigger('togglePlay.event');
      }
      this.isTapping = true;
      if(window.tapIntervalID) {
        window.clearInterval(tapIntervalID);
      }
      for(var i = 0; i < window.signature; i++) {
        window.beatArray[i] = 0;
      }
      this.isWaiting = true;
      this.signature = 0;

      if (this.hasGetUserMedia()) {
        console.log("we do have user media access.");
        var ƒthis = this;
        navigator.webkitGetUserMedia({audio: true}, function(stream) {
          var microphone = ƒthis.context.createMediaStreamSource(stream);
          ƒthis.microphone = microphone;
          ƒthis.micGain = ƒthis.context.createGainNode();
          ƒthis.micGain.gain = ƒthis.micLevel;
          ƒthis.jsNode = ƒthis.context.createScriptProcessor(512, 2, 2);
          ƒthis.microphone.connect(ƒthis.micGain);
          ƒthis.microphone.connect(ƒthis.context.destination);   
          ƒthis.micGain.connect(ƒthis.jsNode);
          ƒthis.jsNode.connect(ƒthis.context.destination);
          ƒthis.prevTime = new Date().getTime();
          ƒthis.jsNode.onaudioprocess = (function() {
            return function(e) {
              ƒthis.analyze(e);
            };
          }());
          ƒthis.waveform = new Float32Array(ƒthis.jsNode.bufferSize);   
        }, this.onFailSoHard);
      } 
      else {
        alert('getUserMedia() is not supported in your browser');
      }
    },

    recordButtonClicked: function() {
      console.log('Tap Tempo Clicked');
      if(this.transport.isPlaying) {
        dispatch.trigger('togglePlay.event');
      }
      $('#transport').click();
      this.isTapping = true;
      if(window.tapIntervalID) {
        window.clearInterval(tapIntervalID);
      }
      for(var i = 0; i < window.signature; i++) {
        window.beatArray[i] = 0;
      }
      this.isWaiting = false;
      this.isRecording = true;

      if (this.hasGetUserMedia()) {
        console.log("we do have user media access.");
        var ƒthis = this;
        navigator.webkitGetUserMedia({audio: true}, function(stream) {
          var microphone = ƒthis.context.createMediaStreamSource(stream);
          ƒthis.microphone = microphone;
          ƒthis.micGain = ƒthis.context.createGainNode();
          ƒthis.micGain.gain = ƒthis.micLevel;
          ƒthis.jsNode = ƒthis.context.createScriptProcessor(512, 2, 2);
          ƒthis.microphone.connect(ƒthis.micGain);
          ƒthis.microphone.connect(ƒthis.context.destination);
          ƒthis.micGain.connect(ƒthis.jsNode);
          ƒthis.jsNode.connect(ƒthis.context.destination);
          ƒthis.prevTime = new Date().getTime();
          ƒthis.jsNode.onaudioprocess = (function() {
            return function(e) {
              ƒthis.analyze(e);
            };
          }());
          ƒthis.waveform = new Float32Array(ƒthis.jsNode.bufferSize);   
        }, this.onFailSoHard);
      } 
      else {
        alert('getUserMedia() is not supported in your browser');
      } 
    },

    analyze: function(e){
      var time = e.timeStamp;
      this.e = e;
      this.waveform = e.inputBuffer.getChannelData(0);
      this.processWaveform(time, this.waveform);
    },

    stopRecording: function() {
      this.signature = 0;
      this.countIn = 1;
      this.globalDate = new Date();
      this.previousTime = 0;
      this.timeIntervals = [0];
      this.isTapping = false;
      this.isRecording = false;
      this.beatArray = new Array();
      this.waitCount = 0;
      this.isWaiting = true;
      this.microphone.disconnect();
      this.jsNode.disconnect();
      this.micGain.disconnect();

      // If the waitIntervalID or tapIntervalID exist, clear them
      if(window.waitIntervalID) {
        window.clearInterval(window.waitIntervalID);
      }
      if(window.tapIntervalID) {
        window.clearInterval(tapIntervalID);
      }
    },

    hasGetUserMedia: function() {
      return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia || navigator.msGetUserMedia);
    },

    onFailSoHard: function(e) {
      console.log('Reeeejected!', e);
    },

    roundTo50: function(x){
      return (x % 50) >= 25 ? parseInt(x / 50) * 50 + 50 : parseInt(x / 50) * 50;
    },
    roundTo100: function(x){
      return (x % 100) >= 50 ? parseInt(x / 100) * 100 + 100 : parseInt(x / 100) * 100;
    },
    roundTo150: function(x){
      return (x % 150) >= 75 ? parseInt(x / 150) * 150 + 150 : parseInt(x / 150) * 150;
    },
    roundTo200: function(x){
      return (x % 200) >= 100 ? parseInt(x / 200) * 200 + 200 : parseInt(x / 200) * 200;
    },
    roundTo250: function(x){
      return (x % 250) >= 125 ? parseInt(x / 250) * 250 + 250 : parseInt(x / 250) * 250;
    }
  });
  return new state;
});