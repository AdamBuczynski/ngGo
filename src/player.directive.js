/**
 * Module definition and dependencies
 */
angular.module('ngGo.Player.Directive', [
	'ngGo.Board.Service',
	'ngGo.Board.Directive'
])

/**
 * Directive definition
 */
.directive('player', function($window, $document, Player, Board) {
	return {
		restrict: 'E',

		/**
		 * Controller
		 */
		controller: function($scope) {

			//Initialize player
			$scope.Player = Player;

			//Create a new board for the player and set it in scope for the
			//child board and layer directives to use
			$scope.Board = Player.board = new Board();

			//Initialize dimensions
			$scope.dimensions = {
				width: 0,
				height: 0
			};
		},

		/**
		 * Linking function
		 */
		link: function($scope, element, attrs) {

			//Get parent element
			var parent = element.parent(),
				parentSize = Math.min(parent[0].clientWidth, parent[0].clientHeight);

			//Set dimensions
			element.css({width: parentSize, height: parentSize});
			$scope.dimensions = {
				width: parentSize,
				height: parentSize
			};

			//On resize, change the board dimensions
			angular.element($window).on('resize.ngGo.player', function() {
				$scope.$apply(function() {
					parentSize = Math.min(parent[0].clientWidth, parent[0].clientHeight);
					element.css({width: parentSize, height: parentSize});
					$scope.dimensions = {
						width: parentSize,
						height: parentSize
					};
				});
			});

			//Bind other needed event listeners to the element
			var events = Player.getElementEvents();
			for (var e = 0; e < events.length; e++) {

				//Keydown event is registered on the document to prevent having to focus the board first
				if (events[e] == 'keydown') {
					$document.on('keydown.ngGo.player', Player.broadcast.bind(Player, events[e]));
				}

				//All other events apply on the element
				else {
					element.on(events[e] + '.ngGo.player', Player.broadcast.bind(Player, events[e]));
				}
			}

			//Observe mode and tool attributes
			attrs.$observe('mode', function(mode) {
				Player.switchMode(mode);
			});
			attrs.$observe('tool', function(tool) {
				Player.switchTool(tool);
			});

			//Observe arrowkeys and scrollwheel navigation
			attrs.$observe('arrowKeysNavigation', function(value) {
				Player.setArrowKeysNavigation(value);
			});
			attrs.$observe('scrollWheelNavigation', function(value) {
				Player.setScrollWheelNavigation(value);
			});

			//Observe last move attributes
			attrs.$observe('lastMoveMarker', function(value) {
				Player.setLastMoveMarker(value);
			});
			attrs.$observe('markLastMove', function(value) {
				Player.setMarkLastMove(value);
			});

			attrs.$observe('variationBoardMarkup', function(value) {
				Player.setVariationBoardMarkup(value);
			});
		}
	};
});