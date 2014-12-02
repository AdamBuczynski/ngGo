
/**
 * PlayerModeSolve :: This module governs the "solve" mode of the player, e.g. trying to solve
 * go problems and finding the right move or variations.
 */

/**
 * Module definition and dependencies
 */
angular.module('ngGo.Player.Mode.Solve.Service', [
	'ngGo'
])

/**
 * Run block
 */
.run(function(Player, PlayerModes, PlayerModeSolve) {

	/**
	 * Register mode
	 */
	Player.modes[PlayerModes.SOLVE] = PlayerModeSolve;

	/**
	 * Register event handlers
	 */
	Player.on('gameLoaded', PlayerModeSolve.gameLoaded, PlayerModes.SOLVE);
	Player.on('modeEnter', PlayerModeSolve.modeEnter, PlayerModes.SOLVE);
	Player.on('modeExit', PlayerModeSolve.modeExit, PlayerModes.SOLVE);
	Player.on('keydown', PlayerModeSolve.keyDown, PlayerModes.SOLVE);
	Player.on('update', PlayerModeSolve.update, PlayerModes.SOLVE);
	Player.on('config', PlayerModeSolve.config, PlayerModes.SOLVE);
	Player.on('click', PlayerModeSolve.click, PlayerModes.SOLVE);
	Player.on('hover', PlayerModeSolve.hover, PlayerModes.SOLVE);

	//The player color for this problem
	Player.problemPlayerColor = 0;

	//Solved flag
	Player.problemSolved = false;

	//Off path flag
	Player.problemOffPath = false;
})

/**
 * Factory definition
 */
.factory('PlayerModeSolve', function($document, $timeout, Player, PlayerTools) {

	/**
	 * Block navigation while in timeout
	 */
	var navigationBlocked = false;

	/**
	 * Check if we can make a move
	 */
	var canMakeMove = function() {

		//We can make a move when...

		//...there is no auto play going on
		if (!this.config.solveAutoPlay) {
			return true;
		}

		//...we solved the puzzle already
		if (this.problemSolved) {
			return true;
		}

		//...we are off path
		if (this.problemOffPath) {
			return true;
		}

		//...it's our turn
		if (this.game.getTurn() == this.problemPlayerColor) {
			return true;
		}

		//Otherwise, we can't make a move
		return false;
	};

	/**
	 * Helper to update the hover mark
	 */
	var updateHoverMark = function(x, y) {

		//Falling outside of grid?
		if (!this.board.isOnBoard(x, y)) {
			return;
		}

		//What happens, depends on the active tool
		switch (this.tool) {

			//Move tool
			case PlayerTools.MOVE:

				//Hovering over empty spot where we can make a move?
				if (canMakeMove.call(this) && this.game.isValidMove(x, y)) {
					this.board.add('hover', x, y, {
						type: 'stones',
						value: this.game.getTurn()
					});
				}
				break;
		}
	};

	/**
	 * Helper to show solution paths
	 */
	var showSolutionPaths = function(variations) {
		for (var i = 0; i < variations.length; i++) {
			if (variations[i].move.solution === true) {
				this.board.add('markup', variations[i].move.x, variations[i].move.y, {
					type: this.board.theme.get('problemSolutionMarkup'),
					scale: this.board.theme.get('problemSolutionScale'),
					color: this.board.theme.get('problemSolutionColor')
				});
			}
			else {
				this.board.add('markup', variations[i].move.x, variations[i].move.y, {
					type: this.board.theme.get('problemInvalidMarkup'),
					scale: this.board.theme.get('problemInvalidScale'),
					color: this.board.theme.get('problemInvalidColor')
				});
			}
		}
	};

	/**
	 * Helper to hide solution paths
	 */
	var hideSolutionPaths = function(variations) {
		for (var i = 0; i < variations.length; i++) {
			this.board.remove('markup', variations[i].move.x, variations[i].move.y);
		}
	};

	/**
	 * Draw (or clear) solution paths
	 */
	var drawSolutionPaths = function(show) {

		//Get node and variations
		var node = this.game.getNode(),
			variations = node.getMoveVariations();

		//When showing, make sure it's not during the auto solver's move
		if (show && !this.problemSolved && this.config.solveAutoPlay) {
			if (this.game.getTurn() != this.problemPlayerColor) {
				return;
			}
		}

		//Call helper
		if (show) {
			showSolutionPaths.call(this, variations);
		}
		else {
			hideSolutionPaths.call(this, variations);
		}
	};

	/**
	 * Player mode definition
	 */
	var PlayerModeSolve = {

		/**
		 * Config changes handler
		 */
		config: function(event, setting) {

			//Solution paths setting changes?
			if (setting == 'solutionPaths')	{
				drawSolutionPaths.call(this, this.config.solutionPaths);
			}
		},

		/**
		 * Hover handler
		 */
		hover: function(event) {
			this.board.removeAll('hover');
			updateHoverMark.call(this, event.x, event.y);
		},

		/**
		 * Board update event handler
		 */
		update: function() {

			//Show move variations
			if (this.config.solutionPaths) {
				drawSolutionPaths.call(this, true);
			}
		},

		/**
		 * Handler for keydown events
		 */
		keyDown: function(event, keyboardEvent) {

			//Inside a text field?
			if ($document[0].querySelector(':focus')) {
				return true;
			}

			//Remove hover marks
			this.board.removeAll('hover');

			//Switch key code
			switch (keyboardEvent.keyCode) {

				//Right arrow
				case 39:

					//Go forward one move if solved
					if (this.config.arrowKeysNavigation && this.problemSolved) {
						this.next();
					}
					break;

				//Left arrow
				case 37:
					if (this.config.arrowKeysNavigation && !navigationBlocked) {

						//Go back one move
						this.previous();

						//Go back one more if this is not the player's turn and if
						//the problem hasn't been solved yet
						if (!this.problemSolved && this.config.solveAutoPlay && this.game.getTurn() == -this.problemPlayerColor) {
							this.previous();
						}
					}
					break;

				default:
					return true;
			}

			//Don't scroll with arrows
			if (this.config.lockScroll) {
				keyboardEvent.preventDefault();
			}
		},

		/**
		 * Handler for mouse click events
		 */
		click: function(event, mouseEvent) {

			//Falling outside of grid?
			if (!this.board.isOnBoard(event.x, event.y)) {
				return;
			}

			//Check if we clicked a move variation
			var i = this.game.isMoveVariation(event.x, event.y);

			//A valid variation
			if (i != -1) {

				//Advance to the next position and get the next node
				this.next(i);
				var node = this.game.getNode();

				//No children left? Check if we solved it or not
				if (node.children.length === 0) {
					if (node.move.solution) {
						this.problemSolved = true;
						this.broadcast('solutionFound', node);
					}
					else {
						this.broadcast('solutionWrong', node);
					}
					return;
				}

				//Stop auto-playing if solved
				if (this.problemSolved || !this.config.solveAutoPlay) {
					return;
				}

				//Children left, pick a random one and make a move
				i = Math.floor(Math.random() * node.children.length), self = this;

				//Using timeouts?
				if (this.config.solveAutoPlayTimeout) {

					//Block navigation and run the timeout
					navigationBlocked = true;
					$timeout(function() {
						self.next(i);
						navigationBlocked = false;
					}, this.config.solveAutoPlayTimeout);
					return;
				}

				//Just move to the next node immediately
				this.next(i);
				return;
			}

			//Unknown variation, try to play
			if (this.game.play(event.x, event.y)) {
				this.problemOffPath = true;
				this.updateBoard();
				this.broadcast('solutionWrong', this.game.getNode());
			}

			//Handle hover
			PlayerModeSolve.hover.call(this, event);
		},

		/**
		 * Handler for game loaded
		 */
		gameLoaded: function(event) {

			//Set player color
			this.problemPlayerColor = this.game.getTurn();
		},

		/**
		 * Handler for mode entry
		 */
		modeEnter: function(event) {

			//Set available tools for this mode
			this.tools = [
				PlayerTools.MOVE
			];

			//Set default tool
			this.tool = this.tools[0];

			//Initialize player color
			this.problemPlayerColor = this.game.getTurn();

			//Draw solution variations
			if (this.config.solutionPaths) {
				drawSolutionPaths.call(this, true);
			}
		},

		/**
		 * Handler for mode exit
		 */
		modeExit: function(event) {

			//Hide any solution variations
			if (this.config.solutionPaths) {
				drawSolutionPaths.call(this, false);
			}
		}
	};

	//Return
	return PlayerModeSolve;
});