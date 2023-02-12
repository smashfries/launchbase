#!/bin/bash

echo "Build script is running now!"

cd public/assets/

# Finds all public js files and outputs the paths into file_list.out
find . -maxdepth 10 -name "*.js" -exec echo {} \; > file_list.out

# Loop through all the files in file_list.out and compress them using terser.
while read -r file; do
  path_length=${#file}
  original_file="${file:2:path_length}"
  echo $original_file
  echo "${original_file/.js/.min.js.map}"
  terser $file -o "${file%js}min.js" -c --toplevel -m --source-map "root='/static',url='/static/${original_file/.js/.min.js.map}'"
done <file_list.out

rm -rf file_list.out

cd ../templates/

# Find all html files and outputs the paths into file_list.out
find . -maxdepth 10 -name "*.html" -exec echo {} \; > file_list.out

# Update the js file paths to use the minified version
while read -r file; do
  sed -i "s/.js/.min.js/" $file
done <file_list.out

rm -rf file_list.out

echo "Script has finished running!"
echo "We are ready for production!"
