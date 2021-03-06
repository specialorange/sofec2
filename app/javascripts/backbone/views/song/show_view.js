// Filename: views/songs/show_view
define([
  'jquery',
  'underscore',
  'bbone',
  'backbone/collections/songsCollection',
  'backbone/collections/stage',
  'backbone/models/song',
  'backbone/models/unsavedSong',
  'backbone/views/stage/stageView',
  'text!backbone/templates/song/show.html',
  'text!backbone/templates/tiny/navSave.html',
  'text!backbone/templates/tiny/navLoad.html',
  'text!backbone/templates/tiny/navUpdate.html',
  'text!backbone/templates/tiny/navInfo.html',
  'backbone/models/state'
], function($, _, Backbone, SongsCollection, StageCollection, songModel, unsavedSongModel, StageView, songsBodyTemplate, songNavSaveTemplate, songNavLoadTemplate, songNavUpdateTemplate, songNavInfoTemplate, state){
  return Backbone.View.extend({
    navLoadEl: $('#nav-songs-load'),
    navUpdateEl: $('#nav-songs-update'),
    navInfoEl: $('#nav-songs-info'),
    navSaveEl: $('#nav-songs-save'),
    showBodyEl: $('#show-song'),
    sofCompossitionAreaEl: $('#sof-stage-area'),

    initialize: function(options){
      console.log("Show View initializing...");
      console.warn(options);
      this.model = options;
      console.warn(this.model);

      this.render();
      console.log("Show View initialized");
    },

    update: function(e){
      console.log('Show View Save function starting');      
      var unupdatedSong = new unsavedSongModel();
      unupdatedSong.set('stage', e.data.context.drumkit);
      var toBeUpdatedSong = e.data.context.model;
      //TODO potentially update the content for the current song
      toBeUpdatedSong.set({
        // unupdatedSong is a unsavedSong.js model which contains a 'stage'
        content : JSON.stringify(unupdatedSong.toJSON()),
        title: $('#song-title').val()
      });

      //To pass the variable safely in from BBone to Rails 3.2, you have to include the csrf param and token
      toBeUpdatedSong.set($("meta[name=csrf-param]").attr('content'), $("meta[name=csrf-token]").attr('content'));

      window.router.songs.create( toBeUpdatedSong.toJSON() , {
        success: function(song) {
          console.log('Song updated!');
          this.model = song;
          window.router.songs.add(song);
          console.log(window.router.songs.get(window.router.songs.length));
          
          return window.location.hash = "/" + this.model.id;

        },
        error: function(song, jqXHR) {
          console.error('ERROR UPDATING SONG!!!!    ERROR UPDATING SONG!!!!    ERROR UPDATING SONG!!!!    ERROR UPDATING SONG!!!!');
          return this.model.set({
            errors: $.parseJSON(jqXHR.responseText)
          });
        }
      });

      console.log('Update occurred');

      console.log('Show View Save function completed');      
    },

    render: function(){
      console.log("Show View Rendering...");
      $(this.showBodyEl).html('');      
      console.log('this.model:')
      console.warn(this.model);

      var compiledNavUpdateTemplate = _.template ( songNavUpdateTemplate, this.collection.toJSON());
      var compiledNavLoadTemplate = _.template ( songNavLoadTemplate, this.collection.toJSON());
      var compiledNavTemplate = _.template ( songNavInfoTemplate, this.model.toJSON());
      var compiledBodyTemplate = _.template ( songsBodyTemplate, this.model.toJSON());

      // load the update button
      $(this.navUpdateEl).html(compiledNavUpdateTemplate);
      // load the songs into the load button
      $(this.navLoadEl).html(compiledNavLoadTemplate);
      // change the nav section to the song title name
      $(this.navInfoEl).html(compiledNavTemplate);
      //remove the save button
      $(this.navSaveEl).html('');
      // remove the sof-stage-area 
      //$(this.sofCompossitionAreaEl).html('');
      // change the body to show the title
      $(this.showBodyEl).html(compiledBodyTemplate);

      // Update song
      // context:this => pass the show_view.js back to itself
      this.navUpdateEl.click({context:this},this.update);

      this.drumkit = StageView.build(this.model);
      //TODO calcBeatWidth;
      console.log("Show View rendered");
      return this;
    }

  });
});
