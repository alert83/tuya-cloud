const gulp = require('gulp');
const del = require('del');

const sourceFiles = ['./src/index.html'];
const destination = './build/';

gulp.task('clean', function(){
  return del(destination + '**', {force:true});
});

gulp.task('copy', function () {
  return gulp
      .src(sourceFiles)
      .pipe(gulp.dest(destination))
      ;
});

gulp.task('default', gulp.series('clean', 'copy'));
