// Filename: router.js
/*
  This is the main router for the backbone framework.
*/
define([
  'jquery',
  'underscore',
  'backbone',
  'backbone/views/home/homeView',
  'backbone/views/slider/beatSliderView',
  'backbone/views/beatBars/beatBarsView',
  'backbone/views/components/componentsView',
  'backbone/views/slider/tempoSliderView',
  'backbone/views/transport/transportView',
  'backbone/views/button/repButtonView',
  'app/log',
  'backbone/collections/songsCollection',
  'backbone/views/songs/new_view',
  'backbone/views/songs/index_view',
  'backbone/views/songs/show_view',
  'backbone/views/songs/edit_view',
  'backbone/routers/router'
], function($, _, Backbone, mainHomeView, beatSliderView, beatBarsView, componentsView, tempoSliderView, transportView, repButtonView, log, songsCollection, songsViewNew, songsViewIndex, songsViewShow, songsViewEdit, BackboneRouter){

  var BBRouter = Backbone.Router.extend({
    songs: {},
    routes: {
      'new'       : 'newSong',
      'index'     : 'index',
      ':id/edit'  : 'edit',
      ':id'       : 'show',
      //Catchall
      '.*'        : 'newSong'
    },
    newSong: function(){
      console.log('BB routes => new : newSong');
      var view = new songsViewNew({collection : this.songs});
      mainHomeView.render();
      beatSliderView.render();
      beatBarsView.render();
      componentsView.render();
      tempoSliderView.render();
      transportView.render();
      repButtonView.render();
    },

    index: function(){
      console.log('BB Router => index : index');
    },

    show: function(id){
      console.log('BB Router => :id : show');
      if (!window.router) {
        console.log('TODO reset the window.router.songs  !')
      } else {
        console.log('theres is a router');
      }
      var createdSong = this.songs.get(id);
      var view = new songsViewShow(createdSong);
    },

    edit: function(id){
      console.log('BB Router edit');
    },

  });

  // Initialize the Router, with the options, where (options) is declared in SOF.js
  // and called from application.js
  //
  // (options) == 'assest.js.erb' => App.songs{ songs : <%= Song.all.to_json.html_safe %> }
  // (options) == All the songs in the DB
  var initialize = function(options){
    console.log("BB Router => Initializing...");
    
    console.log('options:');
    console.warn(options);
    console.log('options.songs');
    console.warn(options.songs);

    var bb_router = new BBRouter;

    //TODO HOW IS THIS SONGS COLLECTION GETTING POPULATED?
    bb_router.songs = new songsCollection();
    bb_router.songs.reset(options.songs);

    //If the user does not login we use this to generate a random number
    //to identify the user.
    if (!sessionStorage.userId) {
      sessionStorage.setItem("userId", Math.floor(Math.random()*1000000001));
    }

    //we create a string representation of the inital state
    //and send it to the logging system.
    //(important so that we know the IDs of everything)
    name = '';
    $('.component').each( function() {
      name = name + $(this).attr('id') + '.';

      $(this).children('.measure').each( function() {
        name = name + $(this).attr('id') + '.';

          $(this).children('.beat').each( function() {
            name = name + $(this).attr('id') + '.';
          });
      });

      log.sendLog([[1, "Component structure: "+name]]);
      name = '';
    });

    console.log('BB Router => Initialized');

    // BB API call    
    // we call this so that backbone will allow the back button
    // on the browser to go back through state changes.
    // It has to be at the bottom
    // TODO : Cannot call Backbone.history.start({pushState: true}) because it will break
    Backbone.history.start();
    return bb_router;
  };

  return {
    initialize: initialize
  };
});