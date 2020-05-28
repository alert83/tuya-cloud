const gulp = require('gulp');
const gulpCopy = require('gulp-copy');
const sourceFiles = ['./src/index.html'];
const destination = './build/';

gulp.task('default', function () {
  return gulp
      .src(sourceFiles)
      .pipe(gulp.dest(destination))
      ;
});
