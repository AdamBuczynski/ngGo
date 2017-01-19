
/**
 * Player :: This class brings the board to life and allows a user to interact with it. It
 * handles user input, controls objects going to the board, can load game records, and allows the
 * user to manipulate the board according to the current player mode.
 * Unless you want to display static positions, this is the class you'd use by default.
 */

/**
 * Module definition and dependencies
 */
angular.module('ngGo.Player.Service', [
  'ngGo',
  'ngGo.Player.Directive',
  'ngGo.Player.Mode.Common.Service',
  'ngGo.Board.Service',
  'ngGo.Game.Service',
  'ngGo.Game.Scorer.Service',
])

/**
 * Provider definition
 */
.provider('Player', function(PlayerModes, PlayerTools, MarkupTypes) {

  /**
   * Default configuration
   */
  let defaultConfig = {

    //Default mode/tool
    mode: PlayerModes.REPLAY,
    tool: PlayerTools.MOVE,

    //Keys/scrollwheel navigation
    arrowKeysNavigation: true,
    scrollWheelNavigation: true,

    //Last move marker, leave empty for none
    lastMoveMarker: MarkupTypes.LAST,

    //Indicate variations with markup on the board, and show
    //successor node variations or current node variations
    variationMarkup: true,
    variationChildren: true,
    variationSiblings: false,
  };

  /**
   * Set global default configuration for players
   */
  this.setConfig = function(config) {
    defaultConfig = angular.extend(defaultConfig, config);
  };

  /**
   * Service getter
   */
  this.$get = function(
    $rootScope, $document, $timeout, Game, GameScorer, Board, PlayerTools
  ) {

    /**
     * Helper to append board grid coordinatess to the broadcast event object
     */
    function processMouseEvent(broadcastEvent, mouseEvent) {

      //Can only do this with a board and mouse event
      if (!this.board || !mouseEvent) {
        broadcastEvent.x = -1;
        broadcastEvent.y = -1;
        return;
      }

      //Init
      let x = 0;
      let y = 0;

      //Set x
      if (typeof mouseEvent.offsetX !== 'undefined') {
        x = mouseEvent.offsetX;
      }
      else if (
        mouseEvent.originalEvent &&
        typeof mouseEvent.originalEvent.offsetX !== 'undefined'
      ) {
        x = mouseEvent.originalEvent.offsetX;
      }
      else if (
        mouseEvent.originalEvent &&
        typeof mouseEvent.originalEvent.layerX !== 'undefined'
      ) {
        x = mouseEvent.originalEvent.layerX;
      }

      //Set y
      if (typeof mouseEvent.offsetY !== 'undefined') {
        y = mouseEvent.offsetY;
      }
      else if (
        mouseEvent.originalEvent &&
        typeof mouseEvent.originalEvent.offsetY !== 'undefined'
      ) {
        y = mouseEvent.originalEvent.offsetY;
      }
      else if (
        mouseEvent.originalEvent &&
        typeof mouseEvent.originalEvent.layerY !== 'undefined'
      ) {
        y = mouseEvent.originalEvent.layerY;
      }

      //Apply pixel ratio factor
      x *= (window.devicePixelRatio || 1);
      y *= (window.devicePixelRatio || 1);

      //Append coords
      broadcastEvent.x = this.board.getGridX(x);
      broadcastEvent.y = this.board.getGridY(y);

      //Did we drag?
      if (mouseEvent.drag) {
        broadcastEvent.drag = mouseEvent.drag;
      }
    }

    /**
     * Player class
     */
    const Player = {

      //Player configuration
      config: {},

      //Board and game instances
      board: null,
      game: null,

      //Available modes and tools
      modes: {},
      tools: [],

      //Player mode and active tool
      mode: '',
      tool: '',

      //Current path
      path: null,

      /**
       * Initialization
       */
      init() {

        //Unlink board instance, create new game
        this.board = null;
        this.game = new Game();

        //Reset path
        this.path = null;

        //Player mode and active tool
        this.mode = '';
        this.tool = '';

        //Arrow keys / scroll wheel navigation
        this.arrowKeysNavigation = false;
        this.scrollWheelNavigation = false;

        //Last move marker
        this.lastMoveMarker = '';

        //Variation markup
        this.variationMarkup = false;
        this.variationChildren = false;
        this.variationSiblings = false;

        //Restricted nodes
        this.restrictNodeStart = null;
        this.restrictNodeEnd = null;

        //Parse config
        this.parseConfig();
      },

      /**
       * Link the player to a HTML element
       */
      linkElement(element) {

        //Set element
        this.element = element;

        //Register document event
        this.registerElementEvent('keydown', $document);

        //Register element events
        this.registerElementEvent('click');
        this.registerElementEvent('mousedown');
        this.registerElementEvent('mouseup');
        this.registerElementEvent('mousemove');
        this.registerElementEvent('mouseout');
        this.registerElementEvent('mousewheel');
        this.registerElementEvent('wheel');
      },

      /**************************************************************************
       * Configuration
       ***/

      /**
       * Parse config instructions
       */
      parseConfig(config) {

        //Extend from default config
        this.config = angular.extend({}, defaultConfig, config || {});

        //Process settings
        this.switchMode(this.config.mode);
        this.switchTool(this.config.tool);
        this.setArrowKeysNavigation(this.config.arrowKeysNavigation);
        this.setScrollWheelNavigation(this.config.scrollWheelNavigation);
        this.setLastMoveMarker(this.config.lastMoveMarker);
        this.setVariationMarkup(
          this.config.variationMarkup,
          this.config.variationChildren,
          this.config.variationSiblings
        );

        //Let the modes parse their config
        for (const mode in this.modes) {
          if (this.modes[mode].parseConfig) {
            this.modes[mode].parseConfig.call(this, this.config);
          }
        }
      },

      /**
       * Set arrow keys navigation
       */
      setArrowKeysNavigation(arrowKeys) {
        if (arrowKeys !== this.arrowKeysNavigation) {
          this.arrowKeysNavigation = arrowKeys;
          this.broadcast('settingChange', 'arrowKeysNavigation');
        }
      },

      /**
       * Set scroll wheel navigation
       */
      setScrollWheelNavigation(scrollWheel) {
        if (scrollWheel !== this.scrollWheelNavigation) {
          this.scrollWheelNavigation = scrollWheel;
          this.broadcast('settingChange', 'scrollWheelNavigation');
        }
      },

      /**
       * Set the last move marker
       */
      setLastMoveMarker(lastMoveMarker) {
        if (lastMoveMarker !== this.lastMoveMarker) {
          this.lastMoveMarker = lastMoveMarker;
          this.broadcast('settingChange', 'lastMoveMarker');
        }
      },

      /**
       * Set variation markup on the board
       */
      setVariationMarkup(variationMarkup, variationChildren, variationSiblings) {

        //One change event for these three settings
        let change = false;

        //Markup setting change?
        if (variationMarkup !== this.variationMarkup) {
          this.variationMarkup = variationMarkup;
          change = true;
        }

        //Children setting change?
        if (
          typeof variationChildren !== 'undefined' &&
          variationChildren !== this.variationChildren
        ) {
          this.variationChildren = variationChildren;
          change = true;
        }

        //Siblings setting change?
        if (
          typeof variationSiblings !== 'undefined' &&
          variationSiblings !== this.variationSiblings
        ) {
          this.variationSiblings = variationSiblings;
          change = true;
        }

        //Did anything change?
        if (change) {
          this.broadcast('settingChange', 'variationMarkup');
        }
      },

      /**************************************************************************
       * Mode and tool handling
       ***/

      /**
       * Register a player mode
       */
      registerMode(mode, PlayerMode) {

        //Register the mode and let it parse the configuration
        this.modes[mode] = PlayerMode;

        //Parse config if we have a handler
        if (this.modes[mode].parseConfig) {
          this.modes[mode].parseConfig.call(this, this.config);
        }

        //Force switch the mode now, if it matches the initial mode
        if (this.mode === mode) {
          this.switchMode(this.mode, true);
          this.switchTool(this.tool, true);
        }
      },

      /**
       * Set available tools
       */
      setTools(tools) {
        this.tools = tools || [PlayerTools.NONE];
      },

      /**
       * Check if we have a player mode
       */
      hasMode(mode) {
        return this.modes[mode] ? true : false;
      },

      /**
       * Check if we have a player tool
       */
      hasTool(tool) {
        return (this.tools.indexOf(tool) !== -1);
      },

      /**
       * Switch player mode
       */
      switchMode(mode, force) {

        //No change?
        if (!force && (!mode || this.mode === mode)) {
          return false;
        }

        //Broadcast mode exit
        if (this.mode) {
          this.broadcast('modeExit', this.mode);
        }

        //Set mode, reset tools and active tool
        this.mode = mode;
        this.tools = [];
        this.tool = PlayerTools.NONE;

        //Broadcast mode entry
        this.broadcast('modeEnter', this.mode);
        return true;
      },

      /**
       * Switch player tool
       */
      switchTool(tool, force) {

        //No change?
        if (!force && (!tool || this.tool === tool)) {
          return false;
        }

        //Validate tool switch (only when there is a mode)
        if (this.mode && this.modes[this.mode] &&
          this.tools.indexOf(tool) === -1) {
          return false;
        }

        //Change tool
        this.tool = tool;
        this.broadcast('toolSwitch', this.tool);
        return true;
      },

      /**
       * Save the full player state
       */
      saveState() {

        //Save player state
        this.playerState = {
          mode: this.mode,
          tool: this.tool,
          restrictNodeStart: this.restrictNodeStart,
          restrictNodeEnd: this.restrictNodeEnd,
        };

        //Save game state
        this.saveGameState();
      },

      /**
       * Restore to the saved player state
       */
      restoreState() {

        //Must have player state
        if (!this.playerState) {
          return;
        }

        //Restore
        this.switchMode(this.playerState.mode);
        this.switchTool(this.playerState.tool);
        this.restrictNodeStart = this.playerState.restrictNodeStart;
        this.restrictNodeEnd = this.playerState.restrictNodeEnd;

        //Restore game state
        this.restoreGameState();
      },

      /**************************************************************************
       * Game record handling
       ***/

      /**
       * Load game record
       */
      load(data, allowPlayerConfig) {

        //Try to load the game record data
        try {
          this.game.load(data);
        }
        catch (error) {
          throw error;
        }

        //Reset path
        this.path = null;

        //Parse configuration from JGF if allowed
        if (allowPlayerConfig || typeof allowPlayerConfig === 'undefined') {
          this.parseConfig(this.game.get('settings'));
        }

        //Dispatch game loaded event
        this.broadcast('gameLoaded', this.game);

        //Board present?
        if (this.board) {
          this.board.removeAll();
          this.board.parseConfig(this.game.get('board'));
          this.processPosition();
        }

        //Loaded ok
        return true;
      },

      /**
       * Reload the existing game record
       */
      reload() {

        //Must have game
        if (!this.game || !this.game.isLoaded()) {
          return;
        }

        //Reload game
        this.game.reload();

        //Update board
        if (this.board) {
          this.board.removeAll();
          this.processPosition();
        }
      },

      /**
       * Save the current state
       */
      saveGameState() {
        if (this.game && this.game.isLoaded()) {
          this.gameState = this.game.getState();
        }
      },

      /**
       * Restore to the saved state
       */
      restoreGameState() {

        //Must have game and saved state
        if (!this.game || !this.gameState) {
          return;
        }

        //Restore state
        this.game.restoreState(this.gameState);

        //Update board
        if (this.board) {
          this.board.removeAll();
          this.processPosition();
        }
      },

      /**************************************************************************
       * Navigation
       ***/

      /**
       * Go to the next position
       */
      next(i) {
        if (this.game && this.game.node !== this.restrictNodeEnd) {
          this.game.next(i);
          this.processPosition();
        }
      },

      /**
       * Go back to the previous position
       */
      previous() {
        if (this.game && this.game.node !== this.restrictNodeStart) {
          this.game.previous();
          this.processPosition();
        }
      },

      /**
       * Go to the last position
       */
      last() {
        if (this.game) {
          this.game.last();
          this.processPosition();
        }
      },

      /**
       * Go to the first position
       */
      first() {
        if (this.game) {
          this.game.first();
          this.processPosition();
        }
      },

      /**
       * Go to a specific move number, tree path or named node
       */
      goto(target) {
        if (this.game && target) {
          this.game.goto(target);
          this.processPosition();
        }
      },

      /**
       * Undo the last position
       */
      undo() {
        if (this.game) {
          if (this.game.undo()) {
            this.processPosition();
            return true;
          }
          return false;
        }
      },

      /**
       * Go to the previous fork
       */
      previousFork() {
        if (this.game) {
          this.game.previousFork();
          this.processPosition();
        }
      },

      /**
       * Go to the next fork
       */
      nextFork() {
        if (this.game) {
          this.game.nextFork();
          this.processPosition();
        }
      },

      /**
       * Go to the next position with a comment
       */
      nextComment() {
        if (this.game && this.game.node !== this.restrictNodeEnd) {
          this.game.nextComment();
          this.processPosition();
        }
      },

      /**
       * Go back to the previous position with a comment
       */
      previousComment() {
        if (this.game && this.game.node !== this.restrictNodeStart) {
          this.game.previousComment();
          this.processPosition();
        }
      },

      /**
       * Restrict navigation to the current node
       */
      restrictNode(end) {

        //Must have game and node
        if (!this.game || !this.game.node) {
          return;
        }

        //Restrict to current node
        if (end) {
          this.restrictNodeEnd = this.game.node;
        }
        else {
          this.restrictNodeStart = this.game.node;
        }
      },

      /**
       * Process a new game position
       */
      processPosition() {

        //No game?
        if (!this.game || !this.game.isLoaded()) {
          return;
        }

        //Get current node and game position
        let node = this.game.getNode();
        let path = this.game.getPath();
        let position = this.game.getPosition();
        let pathChanged = !path.compare(this.path);

        //Update board
        this.updateBoard(node, position, pathChanged);

        //Path change?
        if (pathChanged) {

          //Copy new path and broadcast path change
          this.path = path.clone();
          this.broadcast('pathChange', node);

          //Named node reached? Broadcast event
          if (node.name) {
            this.broadcast('reachedNode.' + node.name, node);
          }
        }

        //Passed?
        if (node.move && node.move.pass) {
          this.broadcast('movePassed', node);
        }
      },

      /**
       * Show move numbers
       */
      showMoveNumbers(fromMove, toMove) {

        //No game?
        if (!this.game || !this.game.isLoaded()) {
          return;
        }

        //Use sensible defaults if no from/to moves given
        fromMove = fromMove || 1;
        toMove = toMove || this.game.getMove();

        //Get nodes for these moves
        const nodes = this.game.getMoveNodes(fromMove, toMove);
        let move = fromMove;

        //Loop nodes
        nodes.forEach(node => {
          this.board.add('markup', node.move.x, node.move.y, {
            type: MarkupTypes.LABEL,
            text: move++,
          });
        });

        //Redraw board markup
        this.board.redraw('markup');
      },

      /**
       * Show move numbers in branch paths.
       */
      showBranchMoveNumbers() {

        //Exit when there is no game
        if (!this.game || !this.game.isLoaded()) {
          return;
        }

        //Get the move move number range in which the variant branch is
        const endMoveNum = this.game.getMove();
        const curGamePath = this.game.clonePath();
        const path = curGamePath.path;
        let startMoveNum;
        for (startMoveNum = 0; startMoveNum <= endMoveNum; ++startMoveNum) {
          const rememberedPath = path[startMoveNum];
          if (rememberedPath > 0) {
            break;
          }
        }
        startMoveNum += 1;
        let moveNum = 1;

        //Exit when the current game path doesn't contain a variant branch
        if (startMoveNum > endMoveNum) {
          return;
        }

        //Get nodes of the moves in the range
        const nodes = this.game.getMoveNodes(startMoveNum, endMoveNum);

        //Draw markups
        nodes.forEach(node => {
          this.board.add('markup', node.move.x, node.move.y, {
            type: MarkupTypes.LABEL,
            text: moveNum.toString(),
          });
          moveNum += 1;
        });

        //Redraw board markup
        this.board.redraw('markup');
      },

      /**************************************************************************
       * Game handling
       ***/

      /**
       * Start a new game
       */
      newGame() {
        this.game = new Game();
        this.processPosition();
      },

      /**
       * Score the current game position
       */
      scoreGame() {

        //Calculate score
        GameScorer.calculate();

        //Get score, points and captures
        let score = GameScorer.getScore();
        let points = GameScorer.getPoints();
        let captures = GameScorer.getCaptures();

        //Remove all markup, and set captures and points
        this.board.layers.markup.removeAll();
        this.board.layers.score.setAll(points, captures);

        //Broadcast score
        this.broadcast('scoreCalculated', score);
      },

      /**************************************************************************
       * Board handling
       ***/

      /**
       * Get the board
       */
      getBoard() {
        return this.board;
      },

      /**
       * Set the board
       */
      setBoard(Board) {

        //Set the board
        this.board = Board;

        //Board ready
        if (this.board) {
          this.broadcast('boardReady', this.board);
        }

        //If a game has been loaded already, parse config and update the board
        if (this.game && this.game.isLoaded()) {
          this.board.removeAll();
          this.board.parseConfig(this.game.get('board'));
          this.processPosition();
        }
      },

      /**
       * Update the board
       */
      updateBoard(node, position, pathChanged) {

        //Must have board
        if (!this.board) {
          return;
        }

        //Update board with new position
        this.board.updatePosition(position, pathChanged);

        //Mark last move
        if (this.lastMoveMarker && node.move && !node.move.pass) {
          this.board.add('markup', node.move.x, node.move.y, this.lastMoveMarker);
        }

        //Broadcast board update event
        this.broadcast('boardUpdate', node);
      },

      /**************************************************************************
       * Event handling
       ***/

      /**
       * Register an element event
       */
      registerElementEvent(event, element) {

        //Which element to use
        if (typeof element === 'undefined' || !element.on) {
          element = this.element;
        }

        //Remove any existing event listener and apply new one
        //TODO: Namespacing events doesn't work with Angular's jqLite
        element.off(event/* + '.ngGo.player'*/);
        element.on(event/* + '.ngGo.player'*/, this.broadcast.bind(this, event));
      },

      /**
       * Event listener
       */
      on(type, listener, mode, $scope) {

        //Must have valid listener
        if (typeof listener !== 'function') {
          throw new Error('Listener is not a function: ' + listener);
        }

        //Scope given as 3rd parameter?
        if (mode && mode.$parent) {
          $scope = mode;
          mode = '';
        }

        //Multiple events?
        if (type.indexOf(' ') !== -1) {
          let types = type.split(' ');
          for (let t = 0; t < types.length; t++) {
            this.on(types[t], listener, mode, $scope);
          }
          return;
        }

        //Determine scope to use
        let scope = $scope || $rootScope;

        //Create listener and return de-registration function
        return scope.$on('ngGo.player.' + type, function() {

          //Filter on mode
          if (mode) {
            if (
              (typeof mode === 'string' && mode !== this.mode) ||
              mode.indexOf(this.mode) === -1
            ) {
              return;
            }
          }

          //Inside a text field?
          if (type === 'keydown' && $document[0].querySelector(':focus')) {
            return;
          }

          //Append grid coordinates for mouse events
          if (type === 'click' || type === 'hover' || type.substr(0, 5) === 'mouse') {
            processMouseEvent.call(this, arguments[0], arguments[1]);
          }

          //Dragging? Prevent click events from firing
          if (this.preventClickEvent && type === 'click') {
            delete this.preventClickEvent;
            return;
          }
          else if (type === 'mousedrag') {
            this.preventClickEvent = true;
          }

          //Call listener
          listener.apply(this, arguments);
        }.bind(this));
      },

      /**
       * Event broadcaster
       */
      broadcast(type, args) {

        //Must have type
        if (!type) {
          return;
        }

        //Wrap in timeout
        $timeout(() => {
          $rootScope.$broadcast('ngGo.player.' + type, args);
        });
      },
    };

    //Initialize
    Player.init();

    //Return object
    return Player;
  };
});
