const gulp = require('gulp');
const gulpCopy = require('gulp-copy');
const sourceFiles = ['src/*.html', 'src/*.json'];
const destination = 'build/';

gulp.task('default', function () {
  return gulp
      .src(sourceFiles)
      .pipe(gulp.dest(destination))
      ;
});
