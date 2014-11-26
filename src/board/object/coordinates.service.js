
/**
 * Coordinates :: This class represents board coordinates and is repsonsible for drawing them.
 */

/**
 * Module definition and dependencies
 */
angular.module('ngGo.Board.Object.Coordinates.Service', [
	'ngGo.Board.Object.Static.Service'
])

/**
 * Factory definition
 */
.factory('Coordinates', function(BoardObjectStatic) {

	/**
	 * Constructor
	 */
	var Coordinates = function(properties, identifier, layer) {

		//Mark as static and set identifier
		this.static = true;

		//Set default layer and identifier
		layer = layer || 'grid';
		identifier = identifier || 'coordinates';

		//Call parent constructor
		BoardObjectStatic.call(this, properties, identifier, layer);
	};

	/**
	 * Extend prototype
	 */
	angular.extend(Coordinates.prototype, BoardObjectStatic.prototype);

	/**
	 * Draw
	 */
	Coordinates.prototype.draw = function(board) {

		//Can only draw when we have dimensions
		if (board.drawWidth === 0 || board.drawheight === 0) {
			return;
		}

		//Get context
		var ctx = board.layers[this.layer].getContext();

		//Get boundary coordinates
		var xl = board.getAbsX(-0.75),
			xr = board.getAbsX(board.width - 0.25),
			yt = board.getAbsY(-0.75),
			yb = board.getAbsY(board.height - 0.25);

		//Get A and I character codes
		var aChar = 'A'.charCodeAt(0),
			iChar = 'I'.charCodeAt(0);

		//Get theme properties
		var cellSize = board.getCellSize(),
			stoneRadius = board.theme.get('stoneRadius', cellSize),
			fillStyle = board.theme.get('coordinatesColor'),
			fontSize = board.theme.get('coordinatesSize', cellSize),
			font = board.theme.get('font') || '';

		//Configure context
		ctx.fillStyle = fillStyle;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.font = fontSize + 'px ' + font;

		//Helper vars
		var i, x, y;

		//Draw vertical coordinates (numbers)
		for (i = 0; i < board.height; i++) {
			y = board.getAbsX(i);

			//Determine number
			var num = (board.section.bottom === 0) ? board.height - i : i + 1;

			//Write text
			ctx.fillText(num, xr, y);
			ctx.fillText(num, xl, y);
		}

		//Draw horizontal coordinates (letters)
		for (i = 0; i < board.width; i++) {
			x = board.getAbsY(i);

			//Determine character code
			var ch = aChar + i;
			if (ch >= iChar) {
				ch++;
			}

			//Write text
			ctx.fillText(String.fromCharCode(ch), x, yt);
			ctx.fillText(String.fromCharCode(ch), x, yb);
		}
	};

	//Return
	return Coordinates;
});