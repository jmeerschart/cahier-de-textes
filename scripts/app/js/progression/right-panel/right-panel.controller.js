(function() {
    'use strict';

    AngularExtensions.addModuleConfig(function(module) {
        //controller declaration
        module.controller("RightPanelController", controller);

        function controller($scope,$rootScope,ProgressionService) {
            let id = Date.now();
            var vm = this;
            $scope.panelVisible = false;

           // $('.mainDiaryContainer').width('84%');
            //$('.quick-search').width('16%');
            $scope.$watch(()=>{
                return  $rootScope.currentRightPanelVisible;
            },(n)=>{
                $scope.currentRightPanelVisible = n;                
            });

            $scope.toggle = function (show){     
                console.log("togle")           
                if (show){
                    $rootScope.currentRightPanelVisible = show;                     
                }else{
                    $rootScope.currentRightPanelVisible = undefined;
                }
            }
        }
    });


})();
