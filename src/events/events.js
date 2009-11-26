
/**
	@name glow.events
	@namespace
	@description Native browser and custom events
 */

//-----------------------------------------------------------------

Glow.provide({
	version: '@SRC@',
	builder: function(glow) {
		glow.events = glow.events || {};
		
		/* storage variables */
		var r = {};
		var eventListeners = {};
		var eventid = 1;
		var listenersByEventId = {};
		var objid = 1;
		var listenersByObjId = {};
		var psuedoPrivateEventKey = '__eventId' + glow.UID;
		var psuedoPreventDefaultKey = psuedoPrivateEventKey + 'PreventDefault';
		var psuedoStopPropagationKey = psuedoPrivateEventKey + 'StopPropagation';
		
		/**
		@name glow.events.addListeners
		@function
		@param {Object[]} attachTo Array of objects to add listeners to
		@param {String} name Name of the event to listen for
		@param {Function} callback Function to call when the event fires.
			The callback is passed a single event object. The type of this
			object depends on the event (see documentation for the event
			you're listening to).
		@param {Object} [thisVal] Value of 'this' within the callback.
			By default, this is the object being listened to.
		 
		@description Convenience method to add listeners to many objects at once.
			If you're wanting to add a listener to a single object, use its
			'on' method.
		*/
		glow.events.addListeners = function (attachTo, name, callback) {
			/*!debug*/
			console.log("events.addListeners");
			/*!gubed*/
			
			var context;
			if(context == undefined){
				context = this;
			}
			if (! attachTo) { throw 'no attachTo parameter passed to addListener'; }
			
			/*!debug*/
			console.log("attachto: "+attachTo+", name:"+""+name+", callback:"+callback+", context:"+context)
			/*gubed!*/
			
			//needs glow.dom
			if (attachTo) {
				var listenerIds = [],
					i = attachTo.length;

				//attach the event for each element, return an array of listener ids
				while (i--) {
					listenerIds[i] = r.addListeners(attachTo[i], name, callback, context);
				}
				
				return listenerIds;
			}
	
			var objIdent;
			if (! (objIdent = attachTo[psuedoPrivateEventKey])) {
				objIdent = attachTo[psuedoPrivateEventKey] = objid++;
			}
			var ident = eventid++;
			var listener = [ objIdent, name, callback, context, ident ];
			listenersByEventId[ident] = listener;

			var objListeners = listenersByObjId[objIdent];
			if (! objListeners) { objListeners = listenersByObjId[objIdent] = {}; }
			var objEventListeners = objListeners[name];
			if (! objEventListeners) { objEventListeners = objListeners[name] = []; }
			objEventListeners[objEventListeners.length] = listener;
			
			
			return ident;
		};

		
		/**
		@name glow.events.fire
		@function
		@param {Object[]} items      Array of objects to add listeners to
		@param {String}   eventName  Name of the event to fire
		@param {glow.events.Event|Object} [Event]  Event object to pass into listeners.
		       You can provide a simple object of key / value pairs which will
		       be added as properties of a glow.events.Event instance.
		
		@description Convenience method to fire events on multiple items at once.
		       If you're wanting to fire events on a single object, use its
		       'fire' method.
	       */
		glow.events.fire = function (attachedTo, name, e) {
			console.log("events.fire");
			if (! attachedTo) throw 'glow.events.fire: required parameter attachedTo not passed (name: ' + name + ')';
   			if (! name) throw 'glow.events.fire: required parameter name not passed';
			if (! e) { e = new glow.events.Event(); }
			if ( e.constructor === Object ) { e = new glow.events.Event( e ) }

			

			e.type = name;
			e.attachedTo = attachedTo;
			if (! e.source) { e.source = attachedTo; }

			if (attachedTo) {

				//attachedTo.each(function(i){

					callListeners(attachedTo, e);

				//});

			} else {

				callListeners(attachedTo, e);

			}

			return e;
		};

		function callListeners(attachedTo, e) {
			console.log("events.callListeners");
			var objIdent,
				objListeners,
				objEventListeners = objListeners && objListeners[e.type];

			// 3 assignments, but stop assigning if any of them are false
			(objIdent = attachedTo[psuedoPrivateEventKey]) &&
			(objListeners = listenersByObjId[objIdent]) &&
			(objEventListeners = objListeners[e.type]);

			if (! objEventListeners) { return e; }

			var listener;
			var listeners = objEventListeners.slice(0);

			// we make a copy of the listeners before calling them, as the event handlers may
			// remove themselves (took me a while to track this one down)
			for (var i = 0, len = listeners.length; i < len; i++) {
				listener = listeners[i];
				if ( listener[2].call(listener[3] || attachedTo, e) === false ) {
					e.preventDefault();
				}
			}

		}
		/**
		@name glow.events.removeListeners
		@function
		@param {Object[]} items  Items to remove events from
		    
		@description Removes all listeners attached to a given object.
			This removes not only listeners you added, but listeners others
			added too. For this reason it should only be used as part of a cleanup
			operation on objects that are about to be destroyed.
			   
			Glow will call this by default on its own classes like NodeList and
			widgets.
		   */
		glow.events.removeListeners = function (obj) {
			console.log("events.removeListeners");
			var i,
				objId,
				listenerIds = [],
				listenerIdsLen = 0,
				eventName,
				events;
			
			
			// cater for arrays & nodelists
			if (obj instanceof Array) {
				//call removeAllListeners for each array member
				i = obj.length; while(i--) {
					r.removeAllListeners(obj[i]);
				}
				return r;
			}
			
			// get the objects id
			objId = obj[psuedoPrivateEventKey];
			
			// if it doesn't have an id it doesn't have events... return
			if (!objId) {
				return r;
			}
			events = listenersByObjId[objId];
			for (eventName in events) {
				i = events[eventName].length; while(i--) {
					listenerIds[listenerIdsLen++] = events[eventName][i][4];
				}
			}
			// remove listeners for that object
			if (listenerIds.length) {
				r.removeListener( listenerIds );
			}
			return r;
		};

		
		/**
		@name glow.events.Target
		@class
		@description An object that can have event listeners and fire events.
		       This is a base class for objects that can fire events. You can
		       extend this class to make your own objects have 'on' and 'fire'
		       methods.
		
		@example
		       // Ball is our constructor
		       function Ball() {
			       // ...
		       }
		       
		       // make Ball inherit from Target
		       glow.lang.extend(Ball, glow.events.Target, {
			       // additional methods for Ball here, eg:
			       bowl: function() {
				       // ...
			       }
		       });
		       
		       // now instances of Ball can receive event listeners
		       var myBall = new Ball();
		       myBall.on('bounce', function() {
			       alert('BOING!');
		       });
		       
		       // and events can be fired from Ball instances
		       myBall.fire('bounce');
	       */
		glow.events.Target = function () {
			/*!debug*/
			console.log("Target");
			/*gubed!*/
		};

		
		/**
		@name glow.events.Target.extend
		@function
		@param {Object} obj Object to add methods to
		
		@description Convenience method to add Target instance methods onto an object.
		       If you want to add events to a class, extend glow.events.Target instead.
		       
		@example
		       // myApplication is a singleton
		       var myApplication = {};
		       
		       glow.events.Target.extend(myApplication);
		       
		       // now myApplication can fire events...
		       myApplication.fire('load');
		       
		       // and other objects can listen for those events
		       myApplication.on('load', function(e) {
			       alert('App loaded');
		       });
	       */
		glow.events.Target.extend = function (obj) {
			/*!debug*/
			console.log("Target.extend");
			console.log("Target.extend obj: "+obj);
			/*gubed!*/
			glow.lang.apply( obj, glow.events.Target.prototype );
		};
		
		/**
		@name glow.events.Target#on
		@function
		@param {String}   eventName  Name of the event to listen for
		@param {Function} callback   Function to call when the event fires.
		       The callback is passed a single event object. The type of this
		       object depends on the event (see documentation for the event
		       you're listening to).
		@param {Object}   [thisVal]  Value of 'this' within the callback.
		       By default, this is the object being listened to.
		
		@description Listen for an event
		
		@returns this
		
		@example
		       myObj.on('show', function() {
			       // do stuff
		       });
	       */
		glow.events.Target.prototype.on = function(eventName, callback, thisVal) {
			/*!debug*/
			console.log("Target#on");
			console.log("Target#on this: "+this)
			/*gubed!*/
			glow.events.addListeners(this, eventName, callback, thisVal);
		}
		
		/**
		@name glow.events.Target#detach
		@function
		@param {String}   eventName  Name of the event to listen for
		@param {Function} callback   Callback to detach
		
		@description Remove an event listener
		
		@returns this
		
		@example
		       function showListener() {
			       // ...
		       }
		       
		       // add listener
		       myObj.on('show', showListener);
		       
		       // remove listener
		       myObj.detach('show', showListener);
		       
		@example
		       // note the following WILL NOT WORK
		       
		       // add listener
		       myObj.on('show', function() {
			       alert('hi');
		       });
		       
		       // remove listener
		       myObj.detach('show', function() {
			       alert('hi');
		       });
		       
		       // this is because both callbacks are different function instances
		       // YUI do it more like this:
		       
		       // add listener
		       var listenerHandle = myObj.on('show', function() {
			       alert('hi');
		       });
		       
		       // remove listener
		       listenerHandle.remove();
		       
		       // the problem here is we lose chaining
	       */
		
		glow.events.Target.prototype.detach = function(name, callback) {
			/*!debug*/
			console.log("Target#detach");
			/*gubed!*/
			glow.events.removeListeners(name, callback);
		}
		
		/**
		@name glow.events.Target#fire
		@function
		@param {String} eventName Name of the event to fire
		@param {glow.events.Event|Object} [Event] Event object to pass into listeners.
		       You can provide a simple object of key / value pairs which will
		       be added as properties of a glow.events.Event instance.
		
		@description Fire an event
		
		@returns glow.events.Event
		
		@example
		       myObj.fire('show');
		       
		@example
		       // adding properties to the event object
		       myBall.fire('bounce', {
			       velocity: 30
		       });
	       
		@example
		       // BallBounceEvent extends glow.events.Event but has extra methods
		       myBall.fire( 'bounce', new BallBounceEvent(myBall) );
	       */
		glow.events.Target.prototype.fire = function(eventName, thisVal) {
			/*!debug*/
			console.log("Target#fire");
			console.log("Target#fire this: "+this);
			/*gubed!*/
			glow.events.fire(this, eventName, thisVal);
		}
		
		/**
		@name glow.events.Event
		@class
		@param {Object} [properties] Properties to add to the Event instance.
		       Each key-value pair in the object will be added to the Event as
		       properties
	       
		@description Describes an event that occurred
		       You don't need to create instances of this class if you're simply
		       listening to events. One will be provided as the first argument
		       in your callback.
	       
		@example
		       // creating a simple event object
		       var event = new glow.events.Event({
			       velocity: 50,
			       direction: 180
		       });
		       
		       // 'velocity' and 'direction' are simple made-up properties
		       // you may want to add to your event object
		       
		@example
		       // inheriting from glow.events.Event to make a more
		       // specialised event object
		       
		       function RocketEvent() {
			       // ...
		       }
		       
		       // inherit from glow.events.Event
		       glow.lang.extend(RocketEvent, glow.events.Event, {
			       getVector: function() {
				       return // ...
			       }
		       });
		       
		       // firing the event
		       rocketInstance.fire( 'landingGearDown', new RocketEvent() );
		       
		       // how a user would listen to the event
		       rocketInstance.on('landingGearDown', function(rocketEvent) {
			       var vector = rocketEvent.getVector();
		       });
	       */
		
		glow.events.Event = function ( obj ) {
			console.log("events.Event");
			if(obj) {
				glow.lang.apply(this, obj);
			}
		};
		
		/**
		@name glow.events.Event#attachedTo
		@type {Object}
		@description The object the listener was attached to.
		       If null, this value will be populated by {@link glow.events.Target#fire}
	       	*/
		
		/**
		@name glow.events.Event#source
		@type Element
		@description The actual object/element that the event originated from.
			
			For example, you could attach a listener to an 'ol' element to 
			listen for clicks. If the user clicked on an 'li' the source property 
			would be the 'li' element, and 'attachedTo' would be the 'ol'.
		*/
		

		
		/**
		@name glow.events.Event#preventDefault
		@function
		@description Prevent the default action of the event.
		       Eg, if the click event on a link is cancelled, the link
		       is not followed.
		       
		       Returning false from an event listener has the same effect
		       as calling this function.
		       
		       For custom events, it's down to whatever fired the event
		       to decide what to do in this case. See {@link glow.events.Event#defaultPrevented defaultPrevented}
		       
		@example
		       myLinks.on('click', function(event) {
			       event.preventDefault();
		       });
		       
		       // same as...
		       
		       myLinks.on('click', function(event) {
			       return false;
		       });
	       */
		glow.events.Event.prototype.preventDefault = function () {
			console.log("events.Event.preventDefault");
			if (this[psuedoPreventDefaultKey]) { return; }
			this[psuedoPreventDefaultKey] = true;
			if (this.nativeEvent && this.nativeEvent.preventDefault) {
				this.nativeEvent.preventDefault();
				this.nativeEvent.returnValue = false;
				
			}
			
		};

		
		/**
		@name glow.events.Event#defaultPrevented
		@function
		@description Has the default been prevented for this event?
		       This should be used by whatever fires the event to determine if it should
		       carry out of the default action.
		
		@returns {Boolean} Returns true if {@link glow.events.Event#preventDefault preventDefault} has been called for this event.
		
		@example
		       // fire the 'show' event
		       // read if the default action has been prevented
		       if ( overlayInstance.fire('show').defaultPrevented() == false ) {
			       // go ahead and show
		       }
	       */
		glow.events.Event.prototype.defaultPrevented = function () {
			console.log("events.Event.defaultPrevented");
			return !! this[psuedoPreventDefaultKey];
		};

		
		/**
		@name glow.events.Event#stopPropagation
		@function
		@description Stops the event propagating. 
		
			For DOM events, this stops the event bubbling up through event 
			listeners added to parent elements. The event object is marked as
			having had propagation stopped (see 
			{@link glow.events.Event#propagationStopped propagationStopped}).
		
		@example
			// catch all click events that are not links
			glow.events.addListener(
				document,
				'click',
				function () { alert('document clicked'); }
			);

			glow.events.addListener(
				'a',
				'click',
				function (e) { e.stopPropagation(); }
			);
		*/
		glow.events.Event.prototype.stopPropagation = function () {
			console.log("events.Event.stopPropagation");
			if (this[psuedoStopPropagationKey]) { return; }
			this[psuedoStopPropagationKey] = true;
			var e = this.nativeEvent;
			if (e) {
				e.cancelBubble = true;
				if (e.stopPropagation) { e.stopPropagation(); }
			}
		};

		
		/**
		@name glow.events.Event#propagationStopped
		@function
		@description Tests if propagation has been stopped for this event.
		
		@returns {Boolean}
		
			True if event propagation has been prevented.

		*/
		glow.events.Event.prototype.propagationStopped = function () {
			console.log("events.Event.propagationStopped");
			return !! this[psuedoStopPropagationKey];
		};
		
		//cleanup to avoid mem leaks in IE
		/*if (glow.env.ie < 8 || glow.env.webkit < 500) {
			r.addListener(window, "unload", clearEvents);
		}*/
	}
});