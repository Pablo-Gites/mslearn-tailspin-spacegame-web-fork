﻿const gulp = require("gulp"),
      rimraf = require("rimraf"),
      concat = require("gulp-concat"),
      cleanCSS = require("gulp-clean-css"),
      uglify = require("gulp-uglify"),
      sass = require("gulp-sass")(require("sass"));

const paths = {
  webroot: "./Tailspin.SpaceGame.Web/wwwroot/",
  js: "./Tailspin.SpaceGame.Web/wwwroot/js/**/*.js",
  minJs: "./Tailspin.SpaceGame.Web/wwwroot/js/**/*.min.js",
  css: "./Tailspin.SpaceGame.Web/wwwroot/css/**/*.css",
  minCss: "./Tailspin.SpaceGame.Web/wwwroot/css/**/*.min.css",
  scss: "./Tailspin.SpaceGame.Web/wwwroot/scss/**/*.scss",
  concatJsDest: "./Tailspin.SpaceGame.Web/wwwroot/js/site.min.js",
  concatCssDest: "./Tailspin.SpaceGame.Web/wwwroot/css/site.min.css"
};

gulp.task("clean:js", done => rimraf(paths.concatJsDest, done));
gulp.task("clean:css", done => rimraf(paths.concatCssDest, done));
gulp.task("clean", gulp.series("clean:js", "clean:css"));

gulp.task("compile:sass", () => {
  return gulp.src(paths.scss)
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(gulp.dest(paths.webroot + "css"));
});

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

gulp.task("min", gulp.series("compile:sass", "min:js", "min:css"));
gulp.task("proj:publish", gulp.series("clean", "min"));
gulp.task("default", gulp.series("min"));