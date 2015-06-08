// Filename: views/menu/login.js
/*
    This is the Login View.
    It is in charge of the login/logout button.
*/
define([
  'jquery',
  'underscore',
  'bbone',
  'backbone/models/user',
  'backbone/views/menu/songListView',
  'crypto-js',
  'js-cookie',
  'text!backbone/templates/menu/login.html',
  'text!backbone/templates/menu/logout.html',
  'logging'
], function($, _, Backbone, User, SongListView, CryptoJS, JQCookie, loginTemplate, logoutTemplate, Logging){

  var LoginView = Backbone.View.extend({
    el : $('.login'), // Specifies the DOM element which this view handles

    events : {
      "click #modal-login" : "modal",
      "click #login-area" : "modal",
      "click #first-close-button" : "modal",
      "click #last-close-button" : "modal",
      "click #login-submit" : "logIn",
      "click #logout-button" : "logOut"
    },
    initialize: function() {
      console.log('LoginView initing...')
      // If the cookie is not empty
      if (!$.isEmptyObject(JQCookie.get())){
        // And has a silly_name
        if($.cookie('silly_name')){
          console.info('We got a cookie with a silly name!');
          this.model = new User({silly_name: $.cookie('silly_name')});
          this.listenTo(this.model, 'change:loggedIn', this.render);
        } else {
          console.error('There is no silly_name on the cookie');
        }
      } else {
        this.model = new User();
        this.listenTo(this.model, 'change:loggedIn', this.render);
      }


      this.render();
    },
    modal: function(){
      var µthis = this;
      $('#my-modal').modal('toggle');
      $('#my-modal').on('hidden.bs.modal', function (e) {
        window.modalOpen = false;
      })
      $('#my-modal').on('shown.bs.modal', function (e) {
        $('#login-name').focus();
        $('#login-submit').on('click', function(){
          µthis.logIn();
        });
        window.modalOpen = true;
      })
    },
    logIn: function() {
      var µthis = this;
      // TODO Check that the inputs are valid
      var uname = $('#login-name').val();
      var pwd = $('#pwd').val();
      // var pwdHash = CryptoJS.MD5(pwd);
      // console.log(pwdHash); // this is a word grouping of 4 words, and needs to be converted to a string
      // console.log(pwdHash.toString(CryptoJS.enc.Hex)); // 912ec803b2ce49e4a541068d495ab570
      var UID = localStorage.getItem('UID');
      var chbox = $('#login-checkbox').is(':checked');

      // JQ AJAX method to send the data to the approriate url with appropriate HTTP method
      $.ajax({
        url: '/api/login/',
        // method: get/post/etc...
        type: 'POST',
        data: {    
          // uname ie: specialorange
          // pwd      : asdf
          // pwd hash : 912ec803b2ce49e4a541068d495ab570
          uname: uname,
          pwd: pwd,
          uid: UID
          }
      })
        .done(function(data){
          console.log('Successful Login! Returned `data`: ', data);
          // dismiss the modal
          $('#first-close-button').click();
          // Update the user model
          µthis.model.setSongs(data.songs);
          µthis.model.logIn();
          // store the data (locally)
          Logging.setUserLoggedIn(data.silly_name);
          Logging.logStorage('Logged in with silly_name: ' + data.silly_name);
          // make a cookie,          
        })
        .fail(function(data){
          console.error('!Failed Login! Returned `data`: ', data);
        })

    },
    logOut: function() {
      var µthis = this;
      console.log('starting to logout');
      var uname = $.cookie('silly_name');

      $.ajax({
        url: '/api/logout/',
        // method: get/post/etc...
        type: 'POST',
        data: {    
          // uname ie: specialorange
          // pwd      : asdf
          // pwd hash : 912ec803b2ce49e4a541068d495ab570
          uname: uname
          }
      })
        .done(function(data){
          if(data === "LOGOUT"){            
            console.log('Successful Logout! Returned `data`: ', data);
            JQCookie.remove('silly_name');
            JQCookie.remove('UID');
            µthis.model.logOff();
            // store the data (locally)
            Logging.setUserLoggedIn('null');
          }
        }.bind(LoginView))
        .fail(function(data){
          console.error('!Failed Login! Returned `data`: ', data);
        })
    },
    render: function() {
      console.log('LoginView render');
      if(this.model.get('loggedIn')){
        $(this.el).html(logoutTemplate);
        // var SLV = new SongListView(this.model);
      } else {
        $(this.el).html(loginTemplate);
      }
    },
    close: function(){
      console.log('closing Login View');
      this.remove();
      this.unbind();
    }
  });
  // This is a Singleton
  return new LoginView();
});