angular.module("umbraco").controller("Umbraco.Editors.Content.MoveController",
	function ($scope, eventsService, contentResource, navigationService, appState, treeService, localizationService, notificationsService) {

	    var dialogOptions = $scope.dialogOptions;
	    var searchText = "Search...";
	    localizationService.localize("general_search").then(function (value) {
	        searchText = value + "...";
	    });

	    $scope.dialogTreeEventHandler = $({});
	    $scope.busy = false;
	    $scope.searchInfo = {
	        searchFromId: null,
	        searchFromName: null,
	        showSearch: false,
	        results: [],
	        selectedSearchResults: []
	    }

	    var node = dialogOptions.currentNode;

	    function nodeSelectHandler(ev, args) {

			if(args && args.event) {
				args.event.preventDefault();
				args.event.stopPropagation();
			}

			eventsService.emit("editors.content.moveController.select", args);

			if ($scope.target) {
				//un-select if there's a current one selected
				$scope.target.selected = false;
			}

			$scope.target = args.node;
			$scope.target.selected = true;

	    }

	    function nodeExpandedHandler(ev, args) {
			// open mini list view for list views
          	if (args.node.metaData.isContainer) {
				openMiniListView(args.node);
			}
	    }

	    $scope.hideSearch = function () {
	        $scope.searchInfo.showSearch = false;
	        $scope.searchInfo.searchFromId = null;
	        $scope.searchInfo.searchFromName = null;
	        $scope.searchInfo.results = [];
	    }

	    // method to select a search result 
	    $scope.selectResult = function (evt, result) {
	        result.selected = result.selected === true ? false : true;
	        nodeSelectHandler(evt, { event: evt, node: result });
	    };

	    //callback when there are search results 
	    $scope.onSearchResults = function (results) {
	        $scope.searchInfo.results = results;
	        $scope.searchInfo.showSearch = true;
	    };

	    $scope.move = function () {

	        $scope.busy = true;
	        $scope.error = false;

	        contentResource.move({ parentId: $scope.target.id, id: node.id })
                .then(function (path) {
                    $scope.error = false;
                    $scope.success = true;
                    $scope.busy = false;

                    //first we need to remove the node that launched the dialog
                    treeService.removeNode($scope.currentNode);

                    //get the currently edited node (if any)
                    var activeNode = appState.getTreeState("selectedNode");

                    //we need to do a double sync here: first sync to the moved content - but don't activate the node,
                    //then sync to the currently edited content (note: this might not be the content that was moved!!)

                    navigationService.syncTree({ tree: "content", path: path, forceReload: true, activate: false }).then(function (args) {
                        if (activeNode) {
                            var activeNodePath = treeService.getPath(activeNode).join();
                            //sync to this node now - depending on what was copied this might already be synced but might not be
                            navigationService.syncTree({ tree: "content", path: activeNodePath, forceReload: false, activate: true });
                        }
                    });

                }, function (err) {
                    $scope.success = false;
                    $scope.error = err;
                    $scope.busy = false;
                    //show any notifications
                    if (angular.isArray(err.data.notifications)) {
                        for (var i = 0; i < err.data.notifications.length; i++) {
                            notificationsService.showNotification(err.data.notifications[i]);
                        }
                    }
                });
	    };

	    $scope.dialogTreeEventHandler.bind("treeNodeSelect", nodeSelectHandler);
	    $scope.dialogTreeEventHandler.bind("treeNodeExpanded", nodeExpandedHandler);

	    $scope.$on('$destroy', function () {
	        $scope.dialogTreeEventHandler.unbind("treeNodeSelect", nodeSelectHandler);
	        $scope.dialogTreeEventHandler.unbind("treeNodeExpanded", nodeExpandedHandler);
	    });

		// Mini list view
		$scope.selectListViewNode = function (node) {
			node.selected = node.selected === true ? false : true;
			nodeSelectHandler({}, { node: node });
		};

		$scope.closeMiniListView = function () {
			$scope.miniListView = undefined;
		};

		function openMiniListView(node) {
			$scope.miniListView = node;
		}

	});