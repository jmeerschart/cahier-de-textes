(function() {
    'use strict';

    AngularExtensions.addModuleConfig(function(module) {

        module.controller("DiaryCalendarController", controller);

        function controller($scope,$timeout,$window,$element,$location) {
            // use controllerAs practice
            var vm = this;

            /*
             * Initilisation function
             */
            init();

            function init() {
                //display options
                vm.display = {
                    editItem: false,
                    createItem: false,
                    readonly: $scope.readOnly
                };

                //$scope.firstDay = !$scope.firstDay ? moment() : $scope.firstDay;

                /**
                 * Used to know if user clicked on calendar event
                 * or is dragging  to prevent ng-click
                 */
                vm.itemMouseEvent = {
                    lastMouseDownTime: undefined,
                    lastMouseClientX: undefined,
                    lastMouseClientY: undefined
                };

                bindEvents();
            }

            $scope.$watch("mondayOfWeek",function(n,o){

                if (!$scope.mondayOfWeek){
                    return;
                }

                var date = moment();

                // create calendar objet
                vm.calendar = new calendar.Calendar({
                    week: moment($scope.mondayOfWeek).week(),
                    year: moment($scope.mondayOfWeek).year()
                });

                /*
                * //TODO no a good practice but all the code refer to model.calendar
                * try to dissociate
                */
                model.calendar = vm.calendar;


                vm.calendar.week = $scope.mondayOfWeek.week();
                vm.calendar.setDate($scope.mondayOfWeek);

                $scope.lastDay = moment($scope.mondayOfWeek).add(6,'d');

            });

            /*
            *   all events binded here
            */
            function bindEvents(){
                //set items watcher
                $scope.$watch('items', function(n, o) {
                    vm.refreshCalendar();
                });
                // add event listener
                $scope.$on('calendar.refreshItems',function(){
                    vm.refreshCalendar();
                });

                angular.element($window).bind('resize', _.throttle(disposeItems,50));
            }

            /*
             * refresh calendar every items modification
             */
            vm.refreshCalendar = function() {
                if(!vm.calendar){
                    return;
                }
                var date = moment();
                vm.calendar.clearScheduleItems();
                let scheduleItems = _.where(_.map($scope.items, function(item) {
                    item.beginning = item.startMoment;
                    item.end = item.endMoment;
                    return item;
                }), {
                    is_periodic: false
                });
                vm.calendar.addScheduleItems(scheduleItems);
                //TODO remove?
                console.log(moment().diff(date));
                $timeout(function(){
                    console.log(moment().diff(date));
                    disposeItems();
                    console.log(moment().diff(date));
                });
            };

            //between not supported on the current underscore version
            vm.between=function(date,start,end){
                return date.isAfter(start) && date.isBefore(end);
            };

            vm.removeCollisions = function(day){
                _.each(day.scheduleItems,(scheduleItem)=>{
                    delete scheduleItem.calendarGutter ;
                });
            };

            //calc colisions
            vm.calcAllCollisions = function(item,day){
                var calendarGutter = 0;
                var collision = true;
                while (collision) {
                    collision = false;
                    day.scheduleItems.forEach(function(scheduleItem) {
                        /*if (scheduleItem === item) {
                            return;
                        }*/
                      if( vm.between(item.beginning,scheduleItem.beginning,scheduleItem.end) ||
                              vm.between(item.end,scheduleItem.beginning,scheduleItem.end) ||
                              vm.between(scheduleItem.end,item.beginning,item.end)){
                            if (scheduleItem.calendarGutter === calendarGutter) {
                                calendarGutter++;
                                collision = true;
                            }
                        }
                    });
                }
                item.calendarGutter = calendarGutter;
            };

            /*
            * dispose item elements
            */
            function disposeItems(){
                let nbItemsDisposed=0;
                //recal all collisions
                _.each(vm.calendar.days.all,(day)=>{
                    vm.removeCollisions(day);
                    _.each(day.scheduleItems.all, (item) => {
                        vm.calcAllCollisions(item,day);
                    });
                });

                _.each(vm.calendar.days.all,(day)=>{
                    _.each(day.scheduleItems.all, (item) => {
                        disposeItem(item,day);
                        nbItemsDisposed++;
                    });
                });
            }

            /*
            * dispose on item
            */
            function disposeItem(item,day){

                var itemWidth = day.scheduleItems.scheduleItemWidth(item);
                var dayWidth = $element.find('.day').width();

                var beginningMinutesHeight = item.beginning.minutes() * calendar.dayHeight / 60;
                var endMinutesHeight = item.end.minutes() * calendar.dayHeight / 60;
                var hours = calendar.getHours(item, day);
                var top = (hours.startTime - calendar.startOfDay) * calendar.dayHeight + beginningMinutesHeight;
                var containerTop = "0px";
                var containerHeight ="100%";

                var scheduleItemHeight = ((hours.endTime - hours.startTime) * calendar.dayHeight - beginningMinutesHeight + endMinutesHeight);
                if (top < 0) {
                    containerTop =  (Math.abs(top) - 5) + 'px';
                    containerHeight = scheduleItemHeight + top + 5 + 'px';
                }

                item.position = {
                    scheduleItemStyle : {
                        width : itemWidth + '%',
                        top: top + 'px',
                        left: (item.calendarGutter * (itemWidth * dayWidth / 100)) + 'px',
                        height : scheduleItemHeight + 'px'
                    },
                    containerStyle : {
                        top : containerTop,
                        height : containerHeight
                    }
                };
            }

            vm.createItem = function(day, timeslot) {
                $scope.newItem = {};
                var year = vm.calendar.year;
                if (day.index < vm.calendar.firstDay.dayOfYear()) {
                    year++;
                }
                $scope.newItem.beginning = moment().utc().year(year).dayOfYear(day.index).hour(timeslot.start);
                $scope.newItem.end = moment().utc().year(year).dayOfYear(day.index).hour(timeslot.end);
                vm.calendar.newItem = $scope.newItem;
                $scope.onCreateOpen();
            };

            vm.closeCreateWindow = function() {
                vm.display.createItem = false;
                $scope.onCreateClose();
            };

            vm.updateCalendarWeek = function() {
                //annoying new year workaround
                if (moment(vm.calendar.dayForWeek).week() === 1 && moment(vm.calendar.dayForWeek).dayOfYear() > 7) {
                    vm.calendar = new calendar.Calendar({
                        week: moment(vm.calendar.dayForWeek).week(),
                        year: moment(vm.calendar.dayForWeek).year() + 1
                    });
                } else if (moment(vm.calendar.dayForWeek).week() === 53 && moment(vm.calendar.dayForWeek).dayOfYear() < 7) {
                    vm.calendar = new calendar.Calendar({
                        week: moment(vm.calendar.dayForWeek).week(),
                        year: moment(vm.calendar.dayForWeek).year() - 1
                    });
                } else {
                    vm.calendar = new calendar.Calendar({
                        week: moment(vm.calendar.dayForWeek).week(),
                        year: moment(vm.calendar.dayForWeek).year()
                    });
                }
                model.trigger('calendar.date-change');
                vm.refreshCalendar();
            };

            $scope.previousTimeslots = function() {
                calendar.startOfDay--;
                calendar.endOfDay--;
                vm.calendar = new calendar.Calendar({
                    week: moment(vm.calendar.dayForWeek).week(),
                    year: moment(vm.calendar.dayForWeek).year()
                });
                vm.refreshCalendar();
            };

            $scope.nextTimeslots = function() {
                calendar.startOfDay++;
                calendar.endOfDay++;
                vm.calendar = new calendar.Calendar({
                    week: moment(vm.calendar.dayForWeek).week(),
                    year: moment(vm.calendar.dayForWeek).year()
                });
                vm.refreshCalendar();
            };

            $scope.onCreateOpen = function() {
                /*if (!allowCreate) {
                    return;
                }*/

                $scope.onCreateOpenAction();
                //$scope.$eval(attributes.onCreateOpen);
                vm.display = {
                    createItem: true
                };
            };
            $scope.onCreateClose = function() {
                $scope.$eval(attributes.onCreateClose);
            };


            $scope.setMouseDownTime = function ($event) {
                vm.itemMouseEvent.lastMouseDownTime = new Date().getTime();
                vm.itemMouseEvent.lastMouseClientX = $event.clientX;
                vm.itemMouseEvent.lastMouseClientY = $event.clientY;
            };

            $scope.redirect = function (path) {
                    $location.path(path);
            };

            /**
             * Redirect to path only when user is doind a real click.
             * If user is draging item redirect will not be called
             * @param item Lesson being clicked or dragged
             * @param $event
             */
            $scope.openOnClickSaveOnDrag = function(item, $event) {

                var path = '/editLessonView/' + item.id;

                // gap between days is quite important
                var xMouseMoved = Math.abs(vm.itemMouseEvent.lastMouseClientX - $event.clientX) > 30;
                // gap between minutes is tiny so y mouse move detection must be accurate
                // so user can change lesson time slightly
                var yMouseMoved = Math.abs(vm.itemMouseEvent.lastMouseClientY - $event.clientY) > 0;

                // fast click = no drag = real click
                // or cursor did not move
                if ((!xMouseMoved && !yMouseMoved) || (new Date().getTime() - vm.itemMouseEvent.lastMouseDownTime) < 300) {
                    // do not redirect to lesson view if user clicked on checkbox
                    if (!($event.target && $event.target.type === "checkbox")) {
                        $scope.redirect(path);
                    }
                }else{
                    $timeout(vm.refreshCalendar);
                }
            };



            $scope.createNewtemFromSchedule = function(item) {
                //vm.createItem = function(day, timeslot) {
                    $scope.newItem = {};
                    var year = vm.calendar.year;
                    console.log("item",item);
                    $scope.newItem.beginning = moment(item.start);//moment().utc().year(year).dayOfYear(item.index).hour(item.start);
                    $scope.newItem.end = moment(item.end);//moment().utc().year(year).dayOfYear(item.index).hour(item.end);
                    vm.calendar.newItem = $scope.newItem;
                    $scope.onCreateOpen();
                //};

            };



        }

    });

})();