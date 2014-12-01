
/**
 * Module definition and dependencies
 */
angular.module('ngGo.Board.Layer.StonesLayer.Service', [
	'ngGo.Service',
	'ngGo.Board.Layer.Service',
	'ngGo.Board.Object.Stone.Service'
])

/**
 * Factory definition
 */
.factory('StonesLayer', function(BoardLayer, Stone, StoneColor) {

	/**
	 * Constructor
	 */
	var StonesLayer = function(board, context) {

		//Call parent constructor
		BoardLayer.call(this, board, context);

		//Set empty value for grid
		this.grid.whenEmpty(StoneColor.NONE);
	};

	/**
	 * Prototype extension
	 */
	angular.extend(StonesLayer.prototype, BoardLayer.prototype);

	/***********************************************************************************************
	 * Object handling
	 ***/

	/**
	 * Set all stones at once
	 */
	StonesLayer.prototype.setAll = function(grid) {

		//Get changes compared to current grid
		var i, changes = this.grid.compare(grid, 'color');

		//Draw added stuff
		for (i = 0; i < changes.add.length; i++) {
			Stone.draw.call(this, changes.add[i]);
		}

		//Clear removed stuff
		for (i = 0; i < changes.remove.length; i++) {
			Stone.clear.call(this, changes.remove[i]);
		}

		//Remember new grid
		this.grid = grid.clone();
	};

	/***********************************************************************************************
	 * Drawing
	 ***/

	/**
	 * Draw layer
	 */
	StonesLayer.prototype.draw = function() {

		//Can only draw when we have dimensions
		if (this.board.drawWidth === 0 || this.board.drawheight === 0) {
			return;
		}

		//Get all stones as objects
		var stones = this.grid.all('color');

		//Draw them
		for (var i = 0; i < stones.length; i++) {
			Stone.draw.call(this, stones[i]);
		}
	};

	/**
	 * Draw cell
	 */
	StonesLayer.prototype.drawCell = function(x, y) {

		//Can only draw when we have dimensions
		if (this.board.drawWidth === 0 || this.board.drawheight === 0) {
			return;
		}

		//On grid?
		if (this.grid.has(x, y)) {
			Stone.draw.call(this, this.grid.get(x, y, 'color'));
		}
	};

	/**
	 * Clear cell
	 */
	StonesLayer.prototype.clearCell = function(x, y) {
		if (this.grid.has(x, y)) {
			Stone.clear.call(this, this.grid.get(x, y, 'color'));
		}
	};

	//Return
	return StonesLayer;
});