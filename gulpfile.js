/// <binding Clean='clean' />
"use strict";

const gulp = require("gulp"),
      rimraf = require("rimraf"),
      concat = require("gulp-concat"),
      cleanCSS = require("gulp-clean-css"),
      uglify = require("gulp-uglify");

const paths = {
  webroot: "./Tailspin.SpaceGame.Web/wwwroot/"
};

const fs = require('fs');

gulp.task("compile:sass", done => {
  const sassPath = paths.webroot + "scss";
  if (!fs.existsSync(sassPath)) {
    console.warn("⚠️ SCSS folder not found. Skipping Sass compilation.");
    return done();
  }

  return gulp.src(sassPath + "/**/*.scss")
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(gulp.dest(paths.webroot + "css"));
});

paths.js = paths.webroot + "js/**/*.js";
paths.minJs = paths.webroot + "js/**/*.min.js";
paths.css = paths.webroot + "css/**/*.css";
paths.minCss = paths.webroot + "css/**/*.min.css";
paths.concatJsDest = paths.webroot + "js/site.min.js";
paths.concatCssDest = paths.webroot + "css/site.min.css";

gulp.task("clean:js", done => rimraf(paths.concatJsDest, done));
gulp.task("clean:css", done => rimraf(paths.concatCssDest, done));
gulp.task("clean", gulp.series(["clean:js", "clean:css"]));

gulp.task("min:js", () => {
  return gulp.src([paths.js, "!" + paths.minJs], { base: "." })
    .pipe(concat(paths.concatJsDest))
    .pipe(uglify())
    .pipe(gulp.dest("."));
});

gulp.task("min:css", () => {
  return gulp.src([paths.css, "!" + paths.minCss])
    .pipe(concat(paths.concatCssDest))
    .pipe(cleanCSS())
    .pipe(gulp.dest("."));
});

gulp.task("min", gulp.series(["min:js", "min:css"]));

gulp.task('proj:publish', gulp.series('min'))

// A 'default' task is required by Gulp v4
gulp.task("default", gulp.series(["min"]));
