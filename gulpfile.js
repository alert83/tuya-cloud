const gulp = require('gulp');
const sourceFiles = ['./src/index.html'];
const destination = './build/';

gulp.task('default', function () {
  return gulp
      .src(sourceFiles)
      .pipe(gulp.dest(destination))
      ;
});
