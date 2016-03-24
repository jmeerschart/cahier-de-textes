function DiaryController($scope, model, route, date) {
    $scope.lightboxes = {
    };
    $scope.currentErrors = [];
    $scope.tabs = {
        createLesson: 'lesson'
    };

    $scope.lesson = new Lesson();
    $scope.homework = new Homework();
    $scope.showCal = false;

   /* model.on('classrooms.sync', function () {
        $scope.lesson.classroom = $scope.homework.classroom = model.classrooms.first();
        $scope.lesson.subject = $scope.homework.subject = model.subjects.first();
        $scope.lesson.audienceType = $scope.homework.audienceType = 'class';
        $scope.lesson.color = $scope.homework.color = 'pink';
        $scope.homework.type = model.homeworkTypes.first();
    });*/

    $scope.lessons = model.lessons;
    $scope.classrooms = model.classrooms;
    $scope.subjects = model.subjects;
    $scope.homeworkTypes = model.homeworkTypes;
    $scope.homeworks = model.homeworks;

    $scope.openLessonView = function(lesson){
        if (lesson) {
            $scope.lesson = new Lesson();
            $scope.lesson.updateData(lesson);
            $scope.newItem = {
                beginning: moment($scope.lesson.beginning),
                end: moment($scope.lesson.end)
            }
        } else {
            $scope.lesson = new Lesson();
            initLesson();
            $scope.newItem = {
                beginning: moment(),
                end: moment()
            }
        }
        $scope.lightboxes.createLesson = true;
    };

    $scope.closeLesson = function() {

    };

    $scope.createLesson = function (start, end) {
        $scope.currentErrors = [];
        $scope.lesson.startTime = start;
        $scope.lesson.endTime = end;
        $scope.lesson.date = start;
        $scope.lesson.save(function () {
            $scope.lightboxes.createLesson = false;
            //TODO don't reload all calendar view
            model.lessons.syncLessons();
            $scope.showCal = !$scope.showCal;
            $scope.$apply();
        }, function (e) {
            validationError(e);
        });
    };

    $scope.updateLesson = function () {
        $scope.currentErrors = [];
        $scope.lesson.save(function () {
            $scope.lightboxes.createLesson = false;
            //TODO don't reload all calendar view
            model.lessons.syncLessons();
            $scope.showCal = !$scope.showCal;
            $scope.$apply();
        }, function (e) {
            validationError(e);
        });
    };

    $scope.createHomework = function () {
        $scope.homework.save();
    };

    //fixme, Camille can we manage the load order with another way
    $scope.initialization = function () {
        model.subjects.sync(function () {
            model.classrooms.syncClassrooms(function () {
                model.lessons.syncLessons(function () {
                    model.homeworks.syncHomeworks(function () {
                    template.open('main', 'main');
                    template.open('create-lesson', 'create-lesson');
                    template.open('create-homework', 'create-homework');
                    template.open('daily-event-details', 'daily-event-details');
                    $scope.$apply();
                    });
                });
            });
        });
    };

    $scope.nextWeek = function () {
        $scope.showCal = !$scope.showCal;
        var next = moment(model.calendar.firstDay).add(7, 'day');
        model.calendar.setDate(next);
        //model.trigger('calendar.date-change');
        model.lessons.syncLessons();
        model.homeworks.syncHomeworks();
    };

    $scope.previousWeek = function () {
        $scope.showCal = !$scope.showCal;
        var prev = moment(model.calendar.firstDay).subtract(7, 'day');
        model.calendar.setDate(prev);
        //model.trigger('calendar.date-change');
        model.lessons.syncLessons();
        model.homeworks.syncHomeworks();
    };

    var initLesson = function() {
        $scope.lesson.classroom = $scope.homework.classroom = model.classrooms.first();
        $scope.lesson.subject = $scope.homework.subject = model.subjects.first();
        $scope.lesson.audienceType = $scope.homework.audienceType = 'class';
        $scope.lesson.color = $scope.homework.color = 'pink';
        $scope.homework.type = model.homeworkTypes.first();
    }

    var validationError = function(e){
        notify.error(e.error);
        $scope.currentErrors.push(e);
        $scope.$apply();
    };
}
