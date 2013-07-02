// Filename: views/measure/measureView.js
/*
  This is the MeasuresView.
  This is contained in a ComponentsView.
  //dthree can be referenced by d3, NOT ignore, and ignore CANNOT be renamed to d3
*/
define([
  'jquery',
  'underscore',
  'backbone',
  'backbone/collections/beats',
  'backbone/models/measure',
  'backbone/views/beat/beatView',
  'text!backbone/templates/measure/audioMeasures.html',
  'text!backbone/templates/measure/linearBarMeasures.html',
  'text!backbone/templates/measure/circularPieMeasures.html',
  'text!backbone/templates/measure/circularBeadMeasures.html',
  'text!backbone/templates/measure/numberLineMeasures.html',
  'colors',
  'app/dispatch',
  'backbone/models/state',
  'app/log'
], function($, _, Backbone, BeatsCollection, MeasureModel, beatView, audioMeasuresTemplate, linearBarMeasuresTemplate, circularPieMeasuresTemplate, circularBeadMeasuresTemplate, numberLineMeasuresTemplate, COLORS, dispatch, state, log){
  return Backbone.View.extend({
    // el: $('.component'),

    // The different representations
    representations: {
      'audio': audioMeasuresTemplate,
      'linear-bar': linearBarMeasuresTemplate,
      'circular-pie': circularPieMeasuresTemplate,
      'circular-bead': circularBeadMeasuresTemplate,
      'number-line': numberLineMeasuresTemplate
    },
    //grab the current measure representation's data-state
    currentMeasureRepresentation: '', //temp-holder until init
    previousMeasureRepresentation: '', //temp-holder until init

    //registering click events to add and remove measures.
    events : {
      'click .addMeasure' : 'addMeasure',
      'click .delete' : 'removeMeasure'
    },

    initialize: function(options){
      //if we're being created by a componentView, we are
      //passed in options. Otherwise we create a single
      //measure and add it to our collection.
      if (options) {
        // console.warn(options);
        if (options.defaultMeasureRepresentation) {
          this.currentMeasureRepresentation = options.defaultMeasureRepresentation;
        }
        if(options.newMeasureRepresentation) {
          this.currentMeasureRepresentation = options.newMeasureRepresentation;
        }
        this.measuresCollection = options.collection;
        this.parent = options.parent;
        this.el = options.el;
        this.vis = {};
        this.vis.svg = d3.select(this.el).append('svg');
        this.vis.svg.attr('class', this.currentMeasureRepresentation);
        this.d3 = {};
        this.circlePath = '';
        this.measureRadius = 40;
        this.unrolled = MeasureModel.unrolled;
      }
      // else {
      //   this.measure = new BeatsCollection;

      //   for (var i = 0; i < 4; i++) {
      //     this.measure.add();
      //   }

      //   this.measuresCollection = new MeasuresCollection;
      //   this.measuresCollection.add({beats: this.measure});
      // }

      if (options['template-key']) {
        this.currentBeatRepresentation = options['template-key'];
      }

      //registering a callback for signatureChange events.
      dispatch.on('signatureChange.event', this.reconfigure, this);
      //Dispatch listeners
      dispatch.on('measureRepresentation.event', this.changeMeasureRepresentation, this);
      dispatch.on('unroll.event', this.unroll, this);
      dispatch.on('tempoChange.event', this.adjustRadius, this);
      this.render();
    },

    changeMeasureRepresentation: function(representation) {
      this.previousMeasureRepresentation = this.currentMeasureRepresentation;
      this.currentMeasureRepresentation = representation;
      // var d3Beats = d3.selectAll($('.d3'));
      // console.warn(d3Beats);
      // for (var i = 0; i<d3Beats.length ; i++){
      //   d3Beats[i].exit();
      // }
      this.render();
    },
    transitionRoll: function(options) {
      if (this.unrolled == false) {
        for(i=0; i<this.measureNumberOfPoints; i++){
            options.circlePath.data([this.circleStates[this.measureNumberOfPoints-1-i]])
                .transition()
                .delay(this.animationDuration*i)
                .duration(this.animationDuration)
                .ease('linear')
                .attr('d', this.pathFunction);
        }
      } else {
        console.log('unroll clicked');
        console.warn(options);
        for(i=0; i<this.measureNumberOfPoints; i++){
            options.circlePath.data([this.circleStates[i]])
                .transition()
                .delay(this.animationDuration*i)
                .duration(this.animationDuration)
                .ease('linear')
                .attr('d', this.pathFunction);
        }
      }
      this.unrolled = !this.unrolled;
    },

    rollup: function() {
      for(i=0; i<this.measureNumberOfPoints; i++){
          circlePath.data([this.circleStates[this.measureNumberOfPoints-1-i]])
              .transition()
              .delay(this.animationDuration*i)
              .duration(this.animationDuration)
              .ease('linear')
              .attr('d', this.pathFunction);
      }
    },

    render: function(){
      // REPLACE whatever is already in the measure container with: a plus sign in the measure rendering
      $(this.el).html('<div class="addMeasure pull-right">+</div>');


      // Circle
      var centerX = 150;
      var centerY = 50;
      var measureStartAngle = 0;
      var beatStartAngle;
      var beatEndAngle;
      var measureRadius = this.measureRadius;
      // Bead
      var circularBeadBeatRadius = 8;
      var measureNumberOfPoints = 60; //always add 1 to close the circle AND keep under 91 to avoid computational and animation delay
      var beadBeatRadious = 15;
      this.measureNumberOfPoints = measureNumberOfPoints;
        // Transition
        var margin = {top: 20, left: 60};
        var lineLength = 2 * measureRadius * Math.PI;
        var lineDivision = lineLength/measureNumberOfPoints;
        var animationDuration = 3000/measureNumberOfPoints;
      // Linear
      var beatBBX;
      var xMeasureLocation = 15; // 5%
      var yMeasureLocation = 10;
      var lbbMeasureWidth = 272; // 90%
      var lbbMeasureHeight = 25;
      var linearBeatXPadding = 0; // 5% left AND right
      var linearBeatYPadding = 0;  // tiny sliver
      var beatHeight = 25 - 2*linearBeatYPadding;
      var beatBBY = 10 + linearBeatYPadding;
      var beatHolderWidth = lbbMeasureWidth-(2*linearBeatXPadding);
      // Time
      var firstBeatStart = 0; // in s
      var timeIncrement = 500; // in ms
      // Audio
      var beatRForAudio = 24;
      var colorForAudio = COLORS.hexColors[5];
      // console.log(this.representations[this.currentMeasureRepresentation]);

      // for each measure in measuresCollection
      _.each(this.measuresCollection.models, function(measure, index) {

        var ƒthis = this;
        var circleStates = [];
        for (i=0; i<measureNumberOfPoints; i++){
            // circle portion
            var circleState = $.map(Array(measureNumberOfPoints), function (d, j) {
              // margin.left + measureRadius
              var x = centerX + lineDivision*i + measureRadius * Math.sin(2 * j * Math.PI / (measureNumberOfPoints - 1));
              // margin.top + measureRadius
              var y =  centerY - measureRadius * Math.cos(2 * j * Math.PI / (measureNumberOfPoints - 1));
              return { x: x, y: y};
            })
            circleState.splice(measureNumberOfPoints-i);
            //line portion
            var lineState = $.map(Array(measureNumberOfPoints), function (d, j) {
               // margin.left + measureRadius
              var x = centerX + lineDivision*j;
              // margin.top
              var y =  centerY - measureRadius;
              return { x: x, y: y};
            })
            lineState.splice(i);
            //together
            var individualState = lineState.concat(circleState);
            circleStates.push(individualState);
        }
        this.circleStates = circleStates;

        // (when representation button changes, the current representation template will get updated)
        // compile the template for a measure
        var measureTemplateParamaters = {
          measure: measure,
          beatHolder:'beatHolder'+measure.cid,
          measureCount:index+1,
          measureAngle: 360.0,
          beatHolderWidth: beatHolderWidth,
          // SVG Properties
          measureWidth: lbbMeasureWidth,
          measureHeight: lbbMeasureHeight,
          measureColor: COLORS.hexColors[COLORS.colorIndices.WHITE],
          // SVG Locations
          cx: centerX,
          cy: centerY,
          xMeasureLocation: xMeasureLocation,
          yMeasureLocation: yMeasureLocation,
          measureR: measureRadius,
          // Bead
          measureNumberOfPoints: measureNumberOfPoints,
          //Audio
          beatRForAudio: beatRForAudio,
          colorForAudio: colorForAudio,
          // Transition
          circleStates: circleStates,
          lineData: lineData,
          pathFunction: this.circlePath,

          //Number Line
          xOffset: beatHolderWidth/this.measuresCollection.models[0].attributes.beats.length / 2,
          yOffset: lbbMeasureHeight / 2
        };

        var compiledTemplate = _.template( this.representations[this.currentMeasureRepresentation], measureTemplateParamaters );

        // find the plus sign we put in there, and right before it, put in the rendered template
        $(this.el).find('.addMeasure').before( compiledTemplate )

        if (currentMeasureRepresentation = "bead") {
          var lineData = $.map(Array(measureNumberOfPoints), function (d, i) {
              var y = margin.top;
              var x = margin.left + i * lineLength / (measureNumberOfPoints - 1)
              return {x: x, y: y}
          });
          var pathFunction = d3.svg.line()
              .x(function (d) {return d.x;})
              .y(function (d) {return d.y;})
              .interpolate('basis'); // bundle | basis | linear | cardinal are also options

          //The Circle SVG Path we draw MUST BE AFTER THE COMPILED TEMPLATE
          var svgContainer = d3.select('#svg'+measure.cid)
              // .call(d3.experiments.dragAll);
          var circlePath = svgContainer //.append('g')
              // .append('path')
              .insert('path', ':first-child')
              .data([circleStates[0]])
              .attr('d', pathFunction)
              .attr('stroke', 'black')
              // .attr('stroke-dasharray', '5, 10')
              .attr('opacity', .2)
              .attr('class', 'circle')
              .attr('class', 'circle-path')

          function transitionRoll(options) {
            if (this.unrolled == false) {
              for(i=0; i<this.measureNumberOfPoints; i++){
                  options.circlePath.data([this.circleStates[this.measureNumberOfPoints-1-i]])
                      .transition()
                      .delay(this.animationDuration*i)
                      .duration(this.animationDuration)
                      .ease('linear')
                      .attr('d', this.pathFunction);
              }
            } else {
              console.log('unroll clicked');
              console.warn(options);
              for(i=0; i<this.measureNumberOfPoints; i++){
                  options.circlePath.data([this.circleStates[i]])
                      .transition()
                      .delay(this.animationDuration*i)
                      .duration(this.animationDuration)
                      .ease('linear')
                      .attr('d', this.pathFunction);
              }
            }
            this.unrolled = !this.unrolled;
          }

          function unroll() {
            for(i=0; i<measureNumberOfPoints; i++){
                circlePath.data([circleStates[i]])
                    .transition()
                    .delay(animationDuration*i)
                    .duration(animationDuration)
                    .ease('linear')
                    .attr('d', pathFunction);
            }
          };
          function reverse() {
            for(i=0; i<measureNumberOfPoints; i++){
                circlePath.data([circleStates[measureNumberOfPoints-1-i]])
                    .transition()
                    .delay(animationDuration*i)
                    .duration(animationDuration)
                    .ease('linear')
                    .attr('d', pathFunction);
            }
          };

          // $('#a'+measure.cid).on('click', dispatch.trigger('unroll.event'), circlePath);
          $('#a'+measure.cid).on('click', unroll);
          $('#b'+measure.cid).on('click', reverse);
        }

        // console.log(this.currentMeasureRepresentation);
        // for each beat in this measure
        _.each(measure.get('beats').models, function(beat, index) {

          // create a beatview
          var measurePassingToBeatViewParamaters = {
            //General
            model:beat,
            parentElHolder:'#beatHolder'+measure.cid,
            parent:measure,
            parentCID:measure.cid,
            singleBeat:'#beat'+beat.cid,
            beatIndex: index,
            margin : margin,
            measureRepresentation:this.currentMeasureRepresentation,
            beatsInMeasure: this.measuresCollection.models[0].attributes.beats.length,
            // To use the range of colors
            color: index,
            // To use one color
            // color: x,
            timeIncrement: timeIncrement,
            //Linear
           // beatBBX: xMeasureLocation + linearBeatXPadding+(this.beatWidth*(index)),
            beatBBY: beatBBY,
            beatHolderWidth: beatHolderWidth,
            linearBeatXPadding: linearBeatXPadding,
            beatWidth: beatHolderWidth/this.measuresCollection.models[0].attributes.beats.length,
            beatHeight: beatHeight,
            // Circular Pie
            cx: centerX,
            cy: centerY,
            measureR: measureRadius,
            beatAngle: 360/this.measuresCollection.models[0].attributes.beats.length,
            beatStartAngle: -90+((360/this.measuresCollection.models[0].attributes.beats.length)*index),
            beatStartTime: firstBeatStart+(index)*(timeIncrement/1000),
            
            // Circular Bead
            beatRadius: circularBeadBeatRadius,
            circleStates: circleStates,
            measureNumberOfPoints: measureNumberOfPoints,

            // Transition
            animationDuration: animationDuration,

            //Audio
            beatRForAudio: beatRForAudio,
            colorForAudio: colorForAudio
          };

          // manipulate linear-bar beat parameters
          measurePassingToBeatViewParamaters.beatBBX = xMeasureLocation + linearBeatXPadding+(measurePassingToBeatViewParamaters.beatWidth*(index));
          measurePassingToBeatViewParamaters.opacity = beat.get('selected');

          // manipulate circular-pie beat parameters
          // 

          new beatView(measurePassingToBeatViewParamaters);
        }, this);
      }, this);

      return this;
    },

    /*
      This is called when the user clicks on the plus to add a new measure.

      It creates a new measure and adds it to the component.
      It generates a string representing the id of the measure and the ids of
      its beats and logs the creation.

      Lastly, it triggers a stopRequest, because we can't continue playing until
      all the durations get recalculated to reflect this new measure.
    */
    addMeasure: function(){
        console.log('add measure');
        var newMeasure = new BeatsCollection;

        for (var i = 0; i < this.parent.get('signature'); i++) {
          newMeasure.add();
        }

        this.measuresCollection.add({beats: newMeasure});

        //Logging
        name = 'measure' + _.last(this.measuresCollection.models).cid + '.';
        _.each(newMeasure.models, function(beats) {
          name = name + 'beat'+ beats.cid + '.';
        }, this);
        log.sendLog([[3, 'Added a measure: ' + name]]);

        //Render
        this.render();
        //Dispatch
        dispatch.trigger('stopRequest.event', 'off');
    },

    /*
      This is called when the user clicks on the minus to remove a measure.
    */
    removeMeasure: function(ev){
      if ($('#measure'+this.measuresCollection.models[0].cid).parent()) {
        //removing the last measure isn't allowed.
        if(this.measuresCollection.models.length == 1) {
          console.log('Can\'t remove the last measure!');
          return;
        }
        console.log('remove measure');

        //we remove the measure and get its model.
        var model = this.measuresCollection.get($(ev.target).parents('.measure').attr('id').replace('measure',''));
        this.measuresCollection.remove(model);

        //send a log event showing the removal.
        log.sendLog([[3, 'Removed a measure: measure' + this.cid]]);

        //re-render the view.
        this.render();

        //trigger a stop request to stop playback.
        dispatch.trigger('stopRequest.event', 'off');
        dispatch.trigger('signatureChange.event', this.parent.get('signature'));
      }
    },
    // This is triggered by signatureChange events.
    reconfigure: function(signature) {
      /* if the containing component is selected, this
         triggers a request event to stop the sound.
         
         Then this destroys the beats and creates
         new beats with the number of beats specified
         by the signature parameter.
      */
      if ($(this.el).hasClass('selected')) {
        dispatch.trigger('stopRequest.event', 'off');
        for (var i = 0; i < this.measuresCollection.models.length; i++) {
          while (this.measuresCollection.models[i].get('beats').length < signature) {
            this.measuresCollection.models[i].get('beats').add();
          }
          while (this.measuresCollection.models[i].get('beats').length > signature) {
            // silent:true means to not call another event
            this.measuresCollection.models[i].get('beats').pop({silent:true});
            // when selected beats equals the denominator, and we remove a beat, we need to recalculate
            // the fraction with the new selected beats
            dispatch.trigger('signatureChange.event', this.measuresCollection.models[i].get('beats').length)
          } 
        }
        //re-render the view.
        this.render();
      }
    },
    adjustRadius: function(tempo) {
      if ($(this.el).hasClass('selected')) {
        console.log('here');
        this.measureRadius = (tempo/120)*40;
        //re-render the view
        this.render();
      }
    }

  });
});