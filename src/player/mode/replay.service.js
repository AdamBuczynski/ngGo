
/**
 * PlayerModeReplay :: This module governs the "replay" mode of the player, e.g. traversing through an
 * existing game record without the ability to deviate from the tree or its variations.
 */

/**
 * Module definition and dependencies
 */
angular.module('ngGo.Player.Mode.Replay.Service', [])

/**
 * Run block
 */
.run(function(Player, PlayerModes, PlayerModeReplay, MarkupTypes) {

	/**
	 * Register mode
	 */
	Player.modes[PlayerModes.REPLAY] = PlayerModeReplay;

	/**
	 * Register event handlers
	 */
	Player.on('modeEnter', PlayerModeReplay.modeEnter, PlayerModes.REPLAY);
	Player.on('modeExit', PlayerModeReplay.modeExit, PlayerModes.REPLAY);
	Player.on('click', PlayerModeReplay.mouseClick, PlayerModes.REPLAY);
	Player.on('mousemove', PlayerModeReplay.mouseMove, PlayerModes.REPLAY);
	Player.on('update', PlayerModeReplay.update, PlayerModes.REPLAY);
	Player.on('toolSwitch', PlayerModeReplay.toolSwitch, PlayerModes.REPLAY);

	/**
	 * Helper to remove move variations from the board
	 */
	var removeMoveVariations = function(nodes) {
		for (var i = 0; i < nodes.length; i++) {
			this.board.remove('markup', nodes[i].move.x, nodes[i].move.y);
		}
	};

	/**
	 * Helper to add move variations to the board
	 */
	var addMoveVariations = function(nodes) {
		for (var i = 0; i < nodes.length; i++) {

			//Auto variation markup should never overwrite existing markup
			if (this.board.has('markup', nodes[i].move.x, nodes[i].move.y)) {
				continue;
			}

			//Add to board
			this.board.add('markup', nodes[i].move.x, nodes[i].move.y, {
				type: MarkupTypes.LABEL,
				text: String.fromCharCode(65+i),
				color: this.board.theme.get('markupVariationColor')
			});
		}
	};

	/**
	 * Set whether to mark variations on the board
	 */
	Player.setVariationBoardMarkup = function(mark) {

		//Set the config parameter
		this.config.variationBoardMarkup = (mark === true || mark === 'true');

		//If we're in replay mode toggle the variations
		if (this.mode == PlayerModes.REPLAY) {
			this.updateMoveVariations(this.config.variationBoardMarkup);
		}
	};

	/**
	 * Show or hide move variations
	 */
	Player.updateMoveVariations = function(show) {

		//Not the right mode, or disabled via configuration?
		if (this.mode != PlayerModes.REPLAY || !this.config.variationBoardMarkup) {
			return;
		}

		//Get the current node
		var node = this.game.getNode(), variations;
		if (!node) {
			return;
		}

		//Child variations?
		if (this.config.variationChildren && node.hasMoveVariations()) {
			variations = node.getMoveVariations();
			if (show) {
				addMoveVariations.call(this, variations);
			}
			else {
				removeMoveVariations.call(this, variations);
			}
		}

		//Sibling variations?
		if (this.config.variationSiblings && node.parent && node.parent.hasMoveVariations()) {
			variations = node.parent.getMoveVariations();
			if (show) {
				addMoveVariations.call(this, variations);
			}
			else {
				removeMoveVariations.call(this, variations);
			}
		}
	};
})

/**
 * Factory definition
 */
.factory('PlayerModeReplay', function(PlayerTools, MarkupTypes, GameScorer) {

	/**
	 * Helper to update the hover mark
	 */
	var updateHoverMark = function(x, y) {

		//No hover layer?
		if (!this.board.layers.hover) {
			return;
		}

		//Remove existing item
		this.board.layers.hover.remove();

		//What happens, depends on the active tool
		switch (this.tool) {

			//Move tool
			case PlayerTools.MOVE:

				//Hovering over empty spot where we can make a move?
				if (!this.game.hasStone(x, y) && this.game.isValidMove(x, y)) {
					this.board.layers.hover.fadedStone(x, y, this.game.getTurn());
				}
				break;

			//Score tool
			case PlayerTools.SCORE:

				//Hovering over a stone means it can be marked dead or alive
				if (this.game.hasStone(x, y)) {
					this.board.layers.hover.markup(x, y, MarkupTypes.MARK);
				}
				break;
		}
	};

	/**
	 * Helper to score the current game position
	 */
	var scoreGame = function() {

		//Calculate score
		GameScorer.calculate();

		//Get score, points and captures
		var score = GameScorer.getScore(),
			points = GameScorer.getPoints(),
			captures = GameScorer.getCaptures();
		console.log(score);

		//Remove all markup
		this.board.removeAll('markup');

		//Set captures and points
		this.board.layers.score.setAll(points, captures);
	};

	/**
	 * Player mode definition
	 */
	var PlayerModeReplay = {

		/**
		 * Board update event handler
		 */
		update: function() {

			//Show move variations
			this.updateMoveVariations(true);
		},

		/**
		 * Handler for mouse click events
		 */
		mouseClick: function(event, mouseEvent) {

			//What happens, depends on the active tool
			switch (this.tool) {

				//Move tool
				case PlayerTools.MOVE:

					//Check if we clicked a move variation
					var i = this.game.isMoveVariation(event.x, event.y);

					//Advance to the next position
					if (i != -1) {
						this.next(i);
					}
					break;

				//Score tool, mark stones dead or alive
				case PlayerTools.SCORE:

					//Mark the clicked item
					GameScorer.mark(event.x, event.y);

					//Restore the board state from pre-scoring
					/*if (this.preScoreState) {
						this.board.restoreState(this.preScoreState);
					}*/

					//Score the current game position
					scoreGame.call(this);
					break;
			}

			//Update hover mark
			updateHoverMark.call(this, event.x, event.y);
		},

		/**
		 * Mouse move handler
		 */
		mouseMove: function(event, mouseEvent) {

			//Nothing to do?
			if (this.frozen || !this.board.layers.hover) {
				return;
			}

			//Last coordinates are the same?
			if (this.board.layers.hover.isLast(event.x, event.y)) {
				return;
			}

			//Update hover mark
			updateHoverMark.call(this, event.x, event.y);
		},

		/**
		 * Handler for mode entry
		 */
		modeEnter: function(event) {

			//Set available tools for this mode
			this.tools = [
				PlayerTools.MOVE,
				PlayerTools.SCORE
			];

			//Set default tool
			this.tool = this.tools[0];

			//Show move variations
			this.updateMoveVariations(true);
		},

		/**
		 * Handler for mode exit
		 */
		modeExit: function(event) {

			//Hide move variations
			this.updateMoveVariations(false);
		},

		/**
		 * Handler for tool switches
		 */
		toolSwitch: function(event) {

			//Switched to scoring?
			if (this.tool == PlayerTools.SCORE) {

				//Remember the current board state
				this.preScoreState = this.board.getState();

				//Load game into scorer
				GameScorer.load(this.game);

				//Score the game position
				scoreGame.call(this);
			}

			//Back to another state?
			else {
				if (this.preScoreState) {
					this.board.restoreState(this.preScoreState);
					this.preScoreState = null;
				}
			}
		}
	};

	//Return
	return PlayerModeReplay;
});