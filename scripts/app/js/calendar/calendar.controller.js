(function() {
    'use strict';

    AngularExtensions.addModuleConfig(function(module) {
        //controller declaration
        module.controller("CalendarController", controller);

        function controller($scope, $rootScope, $timeout, CourseService, $routeParams, constants, $location, HomeworkService, UtilsService, LessonService, $q, SubjectService, ModelWeekService, SecureService) {

            var vm = this;

            $timeout(init);
            /*
             * initialisation calendar function
             */
            function init() {
                //view controls
                $scope.display.showList = false;
                //calendarDailyEvent directive options
                $scope.display.bShowCalendar = true;
                $scope.display.bShowHomeworks = true;
                $scope.display.bShowHomeworksMinified = false;
                if (!model.selectedViewMode) {
                    $scope.goToCalendarView();//model.selectedViewMode = '/diary/public/js/calendar/calendar-view.template.html';
                }
                //calendar Params
                $scope.calendarParams = {
                    isUserTeacher: $scope.isUserTeacher
                };

                //handler calendar updates :
                $scope.$on('calendar.refreshItems', (_, item) => {
                    item.calendarUpdate();
                });

                //handler calendar updates :
                $scope.$on('calendar.refreshCalendar', () => {
                    refreshDatas(UtilsService.getUserStructuresIdsAsString(),
                        $scope.mondayOfWeek,
                        model.isUserParent,
                        model.child ? model.child.id : undefined);
                });

                if (SecureService.hasRight(constants.RIGHTS.SHOW_OTHER_TEACHER)) {

                    //vm.teacher = model.filters.teacher;
                    //vm.audience = model.filters.audience;

                    $scope.$watch(() => {
                        return model.filters.teacher;
                    }, (n, o) => {
                        if (n !== o && n) {

                            $timeout(() => {
                                //model.filters.teacher = vm.teacher;
                                //model.filters.audience = vm.audience;
                                refreshDatas(UtilsService.getUserStructuresIdsAsString(),
                                    $scope.mondayOfWeek,
                                    model.isUserParent,
                                    model.child ? model.child.id : undefined);
                            });
                        }
                    });
                    $scope.$watch(() => {
                        return model.filters.audience;
                    }, (n, o) => {
                        if (n !== o && n) {
                            $timeout(() => {
                                //model.filters.teacher = vm.teacher;
                                //model.filters.audience = vm.audience;
                                refreshDatas(UtilsService.getUserStructuresIdsAsString(),
                                    $scope.mondayOfWeek,
                                    model.isUserParent,
                                    model.child ? model.child.id : undefined);
                            });

                        }
                    });
                }
            }

            //watch delete or add
            $scope.$watch(() => {
                if (model && model.lessons && model.lessons.all) {
                    return model.lessons.all.length;
                } else {
                    return 0;
                }
            }, () => {
                $scope.itemsCalendar = [].concat(model.lessons.all).concat($scope.courses);
            });

            $scope.$watch('routeParams', function(n, o) {
                if ($location.path().indexOf("calendarView") === -1 && $location.path() !== "") {
                    return;
                }
                var mondayOfWeek = moment();
                // mondayOfWeek as string date formatted YYYY-MM-DD
                if ($scope.routeParams.mondayOfWeek) {
                    mondayOfWeek = moment($scope.routeParams.mondayOfWeek);
                } else {
                    if (model.mondayOfWeek) {
                        mondayOfWeek = model.mondayOfWeek;
                    } else {
                        mondayOfWeek = mondayOfWeek.weekday(0);
                    }
                }
                model.mondayOfWeek = mondayOfWeek;
                $scope.showCalendar(mondayOfWeek);

            }, true);

            $scope.routeParams = $routeParams;

            /**
             * Opens the next week view of calendar
             */
            $scope.nextWeek = function() {
                var nextMonday = moment($scope.mondayOfWeek).add(7, 'd');
                $location.path('/calendarView/' + nextMonday.format(constants.CAL_DATE_PATTERN));
            };

            /**
             * Opens the previous week view of calendar
             */
            $scope.previousWeek = function() {
                var nextMonday = moment($scope.mondayOfWeek).add(-7, 'd');
                $location.path('/calendarView/' + nextMonday.format(constants.CAL_DATE_PATTERN));
            };


            /**
             * Load related data to lessons and homeworks from database
             * @param cb Callback function
             * @param bShowTemplates if true loads calendar templates after data loaded
             * might be used when
             */
            var initialization = function(bShowTemplates, cb) {

                // will force quick search panel to load (e.g: when returning to calendar view)
                // see ng-extensions.js -> quickSearch directive
                model.lessonsDropHandled = false;
                model.homeworksDropHandled = false;

                $scope.countdown = 2;

                // auto creates diary.teacher
                if ("ENSEIGNANT" === model.me.type) {
                    var teacher = new Teacher();
                    teacher.create(decrementCountdown(bShowTemplates, cb), $rootScope.validationError);
                } else {
                    decrementCountdown(bShowTemplates, cb);
                }

                // subjects and audiences needed to fill in
                // homeworks and lessons props

                model.childs.syncChildren(function() {
                    vm.child = model.child;
                    vm.children = model.childs;
                    SubjectService.getCustomSubjects(model.isUserTeacher()).then((subjects) => {
                        model.subjects.all = [];
                        if (subjects) {
                            model.subjects.addRange(subjects);
                        }
                    }).then(() => {
                        decrementCountdown(bShowTemplates, cb);
                        model.homeworkTypes.syncHomeworkTypes(function() {
                            // call lessons/homework sync after audiences sync since
                            // lesson and homework objects needs audience data to be built
                            refreshDatas(UtilsService.getUserStructuresIdsAsString(),
                                $scope.mondayOfWeek,
                                model.isUserParent,
                                model.child ? model.child.id : undefined);

                        }, $rootScope.validationError);
                    }).catch((e)=>{
                      $rootScope.validationError();
                      throw e;
                    });
                });
            };


            var decrementCountdown = function(bShowTemplates, cb) {
                $scope.countdown--;
                if ($scope.countdown == 0) {
                    $scope.calendarLoaded = true;
                    $scope.currentSchool = model.currentSchool;

                    if (bShowTemplates) {
                        showTemplates();
                    }
                    if (typeof cb === 'function') {
                        cb();
                    }
                }
            };

            /**
             *
             * @param momentMondayOfWeek First day (monday) of week to display lessons and homeworks
             */
            $scope.showCalendar = function(mondayOfWeek) {
                $scope.display.showList = false;

                $scope.mondayOfWeek = mondayOfWeek;
                if (!$scope.calendarLoaded) {
                    initialization(true);
                    return;
                }

                if (!$scope.mondayOfWeek) {
                    $scope.mondayOfWeek = moment();
                }

                $scope.mondayOfWeek = $scope.mondayOfWeek.weekday(0);

                model.lessonsDropHandled = false;
                model.homeworksDropHandled = false;
                $scope.display.showList = false;

                // need reload lessons or homeworks if week changed
                var syncItems = true; //momentMondayOfWeek.week() != model.calendar.week;



                refreshDatas(UtilsService.getUserStructuresIdsAsString(),
                    $scope.mondayOfWeek,
                    model.isUserParent,
                    model.child ? model.child.id : undefined);
            };


            function refreshDatas(structureIds, mondayOfWeek, isUserParent, childId) {
                var p1;
                var p2;
                if (SecureService.hasRight(constants.RIGHTS.SHOW_OTHER_TEACHER)) {
                    let teacherItem = model.filters.teacher ? model.filters.teacher.item : undefined;
                    if (!teacherItem && !model.filters.audience) {
                        p1 = $q.when([]);
                        p2 = $q.when([]);
                    } else {
                        p1 = LessonService.getOtherLessons([model.filters.structure.id], mondayOfWeek, teacherItem, model.filters.audience);
                        p2 = HomeworkService.getOtherHomeworks([model.filters.structure.id], mondayOfWeek, teacherItem, model.filters.audience);
                    }
                } else {
                    p1 = LessonService.getLessons(structureIds, mondayOfWeek, isUserParent, childId);
                    p2 = HomeworkService.getHomeworks(structureIds, mondayOfWeek, isUserParent, childId);
                }

                //dont load courses if is not at teacher
                var p3 = $q.when([]);
                var p4 = $q.when([]);
                if (model.isUserTeacher()) {
                    //TODO use structureIds
                    p3 = CourseService.getMergeCourses(model.me.structures[0], model.me.userId, mondayOfWeek);
                    if (SecureService.hasRight(constants.RIGHTS.MANAGE_MODEL_WEEK)) {
                        p4 = ModelWeekService.getModelWeeks();
                    }
                }

                return $q.all([p1, p2, p3, p4]).then(results => {
                    let lessons = results[0];
                    let homeworks = results[1];
                    $scope.courses = results[2];
                    let modelWeeks = results[3];

                    let p = $q.when();
                    if ((!$scope.courses || $scope.courses.length === 0) && SecureService.hasRight(constants.RIGHTS.MANAGE_MODEL_WEEK)) {
                            //dont get model if the current week is the model
                        if (modelWeeks.A || modelWeeks.B){
                            if  (
                                (!modelWeeks.A || !moment(modelWeeks.A.beginDate).isSame(mondayOfWeek)) &&
                                (!modelWeeks.B || !moment(modelWeeks.B.beginDate).isSame(mondayOfWeek))){
                                p = ModelWeekService.getCoursesModel($scope.mondayOfWeek).then((modelCourses) => {
                                    $scope.courses = modelCourses;
                                });
                                $scope.isModelWeek = false;
                            }else{
                                if (modelWeeks.A && moment(modelWeeks.A.beginDate).isSame(mondayOfWeek)){
                                    $scope.modelWeekCurrentWeek = 'A';
                                }else{
                                    $scope.modelWeekCurrentWeek = 'B';
                                }
                                $scope.isModelWeek = true;
                            }
                        }
                    }

                    p.then(() => {
                        $scope.currentModelWeekIndicator = moment($scope.mondayOfWeek).weeks() % 2 ? "B" : "A";
                        model.lessons.all.splice(0, model.lessons.all.length);
                        model.lessons.addRange(lessons);
                        model.homeworks.all.splice(0, model.homeworks.all.length);
                        model.homeworks.addRange(homeworks);
                        $scope.itemsCalendar = [].concat(model.lessons.all).concat($scope.courses);
                    });
                });
            }


            $scope.setChildFilter = function(child, cb) {
                refreshDatas(UtilsService.getUserStructuresIdsAsString(), $scope.mondayOfWeek, true, child.id);
            };

            $scope.showCalendarForChild = function(child) {
                $scope.setChildFilter(child);
            };

            $scope.$on('show-child',(_,child)=>{
                refreshDatas(UtilsService.getUserStructuresIdsAsString(), $scope.mondayOfWeek, true, child.id);
            });

            var showTemplates = function() {
                template.open('main', 'main');
                template.open('main-view', 'calendar');
                template.open('create-lesson', 'create-lesson');
                template.open('create-homework', 'create-homework');
                template.open('daily-event-details', 'daily-event-details');
                template.open('daily-event-item', 'daily-event-item');
            };

            /**
             * Display or hide the homework panel
             * in calendar view
             */
            $scope.toggleHomeworkPanel = function() {
                $scope.display.bShowHomeworks = !$scope.display.bShowHomeworks;

                if (!$scope.display.bShowHomeworks && !$scope.display.bShowCalendar) {
                    $scope.display.bShowCalendar = true;
                }
            };

            /**
             * Display/hide calendar
             */
            $scope.toggleCalendar = function() {
                $scope.display.bShowCalendar = !$scope.display.bShowCalendar;
                if (!$scope.display.bShowHomeworks && !$scope.display.bShowCalendar) {
                    $scope.display.bShowHomeworks = true;
                }
            };


            $scope.$watch(()=>{
                return  $rootScope.currentRightPanelVisible;
            },(n)=>{
                $scope.currentRightPanelVisible = n;                
            });             

            $scope.redirect = function(path) {
                $location.path(path);
            };

        }


    });


})();
